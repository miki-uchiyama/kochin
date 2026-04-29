/**
 * 記録データ CSV を Neon の daily_records にインポート（既存同日・同一名は UPSERT）。
 * CSV の列（1行目はヘッダ想定／--no-headers で列位置のみ）:
 * 日付、利用者名、欠席、欠席理由、午前作業係数、
 * 午前評価1〜5、午後作業係数、午後評価1〜5、生活態度1〜4
 *
 * 使い方:
 *   node scripts/import-records-csv.js --file=C:\\temp\\records.csv --dry-run
 *   node scripts/import-records-csv.js -f records.csv --no-headers --skip=0
 *
 * 既定パス（引数無し時）: C:\\temp\\records.csv（または環境変数 IMPORT_RECORDS_CSV）
 *
 * 欠席列: 「欠席」「1」「TRUE」「はい」「Y」などを欠席として扱います（空または 0 で出席）。
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

require('./_load-env-neon');

const { neon } = require('@neondatabase/serverless');


function defaultRecordsPath() {
  if (process.platform === 'win32') {
    return 'C:\\temp\\records.csv';
  }
  return path.join(require('os').tmpdir(), 'records.csv');
}

/** メンバー import と同様 */
function resolveCsvPath(raw) {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  let p = raw.trim();
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1);
  }
  p = path.normalize(p);
  if (!p) {
    return '';
  }
  if (path.isAbsolute(p)) {
    return p;
  }
  return path.resolve(process.cwd(), p);
}

/** 期待するヘッダ名（順序固定の位置対応とも併用） */
const POSITIONAL_LABELS = [
  '日付',
  '利用者名',
  '欠席',
  '欠席理由',
  '午前作業係数',
  '午前評価1',
  '午前評価2',
  '午前評価3',
  '午前評価4',
  '午前評価5',
  '午後作業係数',
  '午後評価1',
  '午後評価2',
  '午後評価3',
  '午後評価4',
  '午後評価5',
  '生活態度1',
  '生活態度2',
  '生活態度3',
  '生活態度4',
];

/** @param {Record<string, string>} obj */
function rowFromPositions(rowArr, /** @type {number} */ startOffset) {
  /** @type {Record<string, string>} */
  const obj = {};
  for (let i = 0; i < POSITIONAL_LABELS.length; i++) {
    const cell = rowArr[startOffset + i];
    obj[POSITIONAL_LABELS[i]] = cell !== undefined && cell !== null ? String(cell) : '';
  }
  return obj;
}

function parseArgs() {
  /** @type {{ dry: boolean, file: string|null, noHeaders: boolean, skip: number }} */
  const out = { dry: false, file: null, noHeaders: false, skip: 0 };
  const argv = process.argv.slice(2);
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') {
      out.dry = true;
      i += 1;
    } else if (a.startsWith('--skip=')) {
      out.skip = parseInt(a.slice('--skip='.length), 10) || 0;
      i += 1;
    } else if (a === '--no-headers') {
      out.noHeaders = true;
      i += 1;
    } else if (a.startsWith('--file=')) {
      out.file = a.slice('--file='.length);
      i += 1;
    } else if (a === '-f' || a === '--file') {
      i += 1;
      if (i < argv.length) {
        out.file = argv[i];
      }
      i += 1;
    } else if (!a.startsWith('-') && !out.file) {
      out.file = a;
      i += 1;
    } else {
      i += 1;
    }
  }
  return out;
}

/** @returns {boolean} */
function parseAbsent(cell) {
  const raw = String(cell ?? '').trim();
  if (!raw) {
    return false;
  }
  const lower = raw.toLowerCase();
  if (['出席', 'いいえ', '0', 'false', 'no', '-'].includes(lower)) {
    return false;
  }
  if (['欠席', 'はい', '1', 'true', 'yes', 'y'].includes(lower)) {
    return true;
  }
  return /欠席/.test(raw);
}

function cellFloat(v) {
  if (v === undefined || v === null) {
    return 0;
  }
  const t = String(v).trim().replace(/,/g, '');
  if (t === '') {
    return 0;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/** アプリでは 1–5 または未評価 0。CSV の空セルは 0 */
function cellScore(v) {
  const t = String(v ?? '').trim();
  if (t === '') {
    return 0;
  }
  const n = Math.round(parseFloat(t.replace(/,/g, '')));
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(5, n));
}

/** @returns {string} YYYY-MM-DD */
function normalizeDate(v) {
  if (v === undefined || v === null) {
    return '';
  }
  let s = String(v).trim();
  const dSpace = /^(\d{4}-\d{1,2}-\d{1,2})\s/;
  const mSpace = dSpace.exec(s);
  if (mSpace) {
    s = mSpace[1];
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const parts = s.split('-');
    const y = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!Number.isFinite(y)) {
      return '';
    }
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  s = s.replace(/\//g, '-');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const parts = s.split('-');
    const y = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return '';
}

/**
 * @param {Record<string, string>} row
 * @returns {object | null}
 */
function rowToPayload(row) {
  const dateKey = normalizeDate(row['日付']);
  const name = String(row['利用者名'] ?? '').trim();
  if (!dateKey || !name) {
    return null;
  }

  if (parseAbsent(row['欠席'])) {
    const reason = String(row['欠席理由'] ?? '').trim();
    return {
      name,
      date: dateKey,
      absent: true,
      reason: reason || '不明',
    };
  }

  const amScores = [1, 2, 3, 4, 5].map((n) => cellScore(row[`午前評価${n}`]));
  const pmScores = [1, 2, 3, 4, 5].map((n) => cellScore(row[`午後評価${n}`]));
  const lifeScores = [1, 2, 3, 4].map((n) => cellScore(row[`生活態度${n}`]));

  const amCoef = cellFloat(row['午前作業係数']);
  const pmCoef = cellFloat(row['午後作業係数']);

  return {
    name,
    date: dateKey,
    absent: false,
    amCoef: amCoef || 1,
    pmCoef: pmCoef || 1,
    amScores,
    pmScores,
    lifeScores,
    amHours: 2.0,
    pmHours: 2.0,
  };
}

/** @param {string} text */
function parseRows(text, noHeaders, skip) {
  /** @type {string[][]} */
  const raw = parse(text, {
    bom: true,
    skip_empty_lines: false,
    relax_column_count: true,
  });

  const sliced = raw.slice(skip);
  if (noHeaders) {
    return sliced.map((line) => rowFromPositions(line, 0));
  }

  if (sliced.length === 0) {
    return [];
  }

  const headerLine = sliced[0].map((c) => String(c).replace(/^\ufeff/, '').trim());
  const dataLines = sliced.slice(1);

  /** 位置が列名と一致しない場合は先頭行をデータとして列位置で解釈 */
  const looksHeader = /日付/.test(headerLine[0] || '') && /利用者/.test(headerLine[1] || '');
  if (!looksHeader) {
    return sliced.map((line) => rowFromPositions(line, 0));
  }

  return dataLines.map((cols) => {
    /** @type {Record<string, string>} */
    const row = {};
    for (let i = 0; i < headerLine.length; i++) {
      const key = headerLine[i];
      row[key] = cols[i] !== undefined && cols[i] !== null ? String(cols[i]) : '';
    }
    return row;
  });
}

async function ensureDailyTable(sql) {
  await sql.query(
    `
    CREATE TABLE IF NOT EXISTS daily_records (
      work_date DATE NOT NULL,
      member_name TEXT NOT NULL,
      payload JSONB NOT NULL,
      PRIMARY KEY (work_date, member_name)
    );
    `,
  );
}

async function main() {
  let { dry, file, noHeaders, skip } = parseArgs();
  if (!file && process.env.IMPORT_RECORDS_CSV) {
    file = process.env.IMPORT_RECORDS_CSV;
  }
  if (!file) {
    file = defaultRecordsPath();
  }

  const resolved = resolveCsvPath(file);
  if (!resolved || !fs.existsSync(resolved)) {
    console.error('CSV が見つかりません。--file= または IMPORT_RECORDS_CSV、既定 C:\\\\temp\\\\records.csv を確認してください。');
    console.error('  解決パス:', resolved || file);
    process.exit(1);
  }

  const text = fs.readFileSync(resolved, 'utf8');
  const rowObjects = parseRows(text, noHeaders, skip);

  /** @type {object[]} */
  const payloads = [];
  let skipped = 0;
  for (const row of rowObjects) {
    const p = rowToPayload(row);
    if (!p) {
      skipped += 1;
      continue;
    }
    payloads.push(p);
  }

  console.log('読込ファイル:', resolved);
  console.log('取り込み候補:', payloads.length, '行 / スキップ（日付・名前なし等）:', skipped);

  if (payloads.length === 0) {
    console.error('インポートする行がありません。ヘッダ行・列名・日付形式を確認してください。');
    process.exit(1);
  }

  if (dry) {
    console.log('[dry-run] 先頭3件の例:');
    console.log(JSON.stringify(payloads.slice(0, 3), null, 2));
    process.exit(0);
  }

  const url = (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()) || '';
  if (!url) {
    console.error('DATABASE_URL が未設定です（.env.local など）');
    process.exit(1);
  }

  const sql = neon(url);
  await ensureDailyTable(sql);

  let ok = 0;
  for (const record of payloads) {
    const name = String(record.name).trim();
    const date = String(record.date).trim();
    const payloadClean = JSON.parse(JSON.stringify(record));

    await sql.query(
      `
      INSERT INTO daily_records (work_date, member_name, payload)
      VALUES (($1)::date, $2, ($3)::jsonb)
      ON CONFLICT (work_date, member_name) DO UPDATE SET
        payload = EXCLUDED.payload;
      `,
      [date, name, JSON.stringify(payloadClean)],
    );
    ok += 1;
  }

  console.log('Neon daily_records に反映しました:', ok, '件');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
