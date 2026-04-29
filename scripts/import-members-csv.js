/**
 * Google スプレッドシートで「ファイル → ダウンロード → 値（CSV）」などで保存した CSV から
 * 利用者名を読み、Neon の state.members を上書きします。
 *
 * 使い方:
 *   node scripts/import-members-csv.js path/to/members.csv
 *   node scripts/import-members-csv.js --file="C:\ユーザー\download\members.csv"
 *   node scripts/import-members-csv.js -f "C:\path with space\members.csv" --column=0 --skip=1 --dry-run
 *
 * Windows の注意:
 *   - パスに日本語やスペースがあるときは --file=... か -f "..." を使う（推奨）
 *   - npm 経由: npm run import:members:csv -- --file=C:\temp\members.csv （-- の後にオプション）
 *   - どうしても失敗する場合: CSV を C:\temp\members.csv など ASCII のみのパスにコピーする
 *   - 環境変数 IMPORT_CSV_PATH にフルパスを置いて node だけ実行しても可
 *
 * --column 利用者名がある列（0始まり）。省略時 0
 * --skip   先頭から何行捨てるか（ヘッダ行など）。省略時 0
 *
 * .env.local の DATABASE_URL が使われます（未設定なら .env 系を探索）
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

require('./_load-env-neon');

const { neon } = require('@neondatabase/serverless');

/** 外側の引用符を除き、相対パスはカレントから解決する */
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

function parseArgs() {
  /** @type {{ column: number, skip: number, dry: boolean, file: string|null }} */
  const out = { column: 0, skip: 0, dry: false, file: null };
  const argv = process.argv.slice(2);
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') {
      out.dry = true;
      i += 1;
    } else if (a.startsWith('--column=')) {
      out.column = parseInt(a.slice('--column='.length), 10) || 0;
      i += 1;
    } else if (a.startsWith('--skip=')) {
      out.skip = parseInt(a.slice('--skip='.length), 10) || 0;
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

async function main() {
  let { column, skip, dry, file } = parseArgs();
  if (!file && process.env.IMPORT_CSV_PATH) {
    file = process.env.IMPORT_CSV_PATH;
  }
  const resolved = file ? resolveCsvPath(file) : '';

  if (!resolved || !fs.existsSync(resolved)) {
    console.error('使い方: node scripts/import-members-csv.js [--file=パス | -f パス] [パス] [--column=0] [--skip=1] [--dry-run]');
    console.error('または: set IMPORT_CSV_PATH=パス  （PowerShell: $env:IMPORT_CSV_PATH="..."）');
    console.error('');
    console.error('ファイルが見つかりません。');
    console.error('  受け取った引数のパス:', file || '(なし)');
    console.error('  解決後のパス:', resolved || '(なし)');
    console.error('');
    console.error('ヒント: 日本語フォルダ名のときは --file=C:\\\\temp\\\\members.csv のように --file= で1つの引数にする、');
    console.error('      または CSV を C:\\\\temp にコピーしてから指定してください。');
    process.exit(1);
  }

  console.log('読込ファイル:', resolved);
  const buf = fs.readFileSync(resolved);
  const text = buf.toString('utf8');

  /** @type {string[][]} */
  let rows;
  try {
    rows = parse(text, {
      bom: true,
      skip_empty_lines: false,
      relax_column_count: true,
    });
  } catch (e) {
    console.error('CSV の解析に失敗:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const sliced = rows.slice(skip);
  /** @type {string[]} */
  const names = [];
  const seen = new Set();
  for (const row of sliced) {
    if (!row || !row.length) {
      continue;
    }
    const cell = row[column];
    if (cell === undefined || cell === null || String(cell).trim() === '') {
      continue;
    }
    const name = String(cell).trim();
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }

  if (names.length === 0) {
    console.error('有効な名前が1件も読み取れませんでした。--column や --skip を確認してください。');
    process.exit(1);
  }

  console.log('読み込み件数:', names.length);
  console.log('先頭:', names.slice(0, 10).join(', '), names.length > 10 ? '…' : '');

  if (dry) {
    console.log('[dry-run] Neon には書き込みません');
    process.exit(0);
  }

  const url = (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()) || '';
  if (!url) {
    console.error('DATABASE_URL が未設定です（.env.local など）');
    process.exit(1);
  }

  const sql = neon(url);
  await sql.query(
    `UPDATE state SET members = ($1)::jsonb WHERE id = 1;`,
    [JSON.stringify(names)],
  );
  console.log('Neon state.members を更新しました');
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
