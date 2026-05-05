/**
 * 工賃管理 — Vercel Serverless + Neon Postgres
 *
 * アクション仕様は従来の Apps Script と同じレスポンス形状（{ status:'ok', ... }）を維持。
 */

const fs = require('fs');
const path = require('path');

/** `vercel dev` は関数に `.env.local` を渡さないことがあるため、手動ロードしておく（既存 env は上書きしない） */
(() => {
  if (process.env.DATABASE_URL) {
    return;
  }
  for (const name of ['.env.local', '.env.development.local', '.env']) {
    const fp = path.join(process.cwd(), name);
    if (fs.existsSync(fp)) {
      require('dotenv').config({ path: fp });
      if (process.env.DATABASE_URL) {
        break;
      }
    }
  }
})();

const { neon } = require('@neondatabase/serverless');

const DEFAULT_GROUPS = [
  { id: 1, coef: 2.4, name: '弁当A・縫製作業A' },
  { id: 2, coef: 2.0, name: 'PC作業A・販売' },
  { id: 3, coef: 1.7, name: '弁当B・農作業A・干し芋製造A' },
  { id: 4, coef: 1.4, name: 'PC作業B・縫製作業B・干し芋袋詰めA' },
  { id: 5, coef: 1.2, name: 'ちっちゃいもA・イラストA・干し芋製造B' },
  { id: 6, coef: 1.0, name: '農作業B・干し芋袋詰めB・ちっちゃいもB' },
  { id: 7, coef: 0.8, name: 'イラストB・軽作業・縫製作業C' },
];

const DEFAULT_MEMBERS = [
  '田中 花子',
  '鈴木 太郎',
  '佐藤 次郎',
  '山田 幸子',
  '中村 健一',
  '高橋 明',
  '伊藤 美咲',
  '渡辺 隆',
  '小林 恵',
];

const DEFAULT_SETTINGS = {
  basic: [350, 300, 250],
  seikinn: [2000, 1000, 0],
  unitPrice: 100,
  groups: DEFAULT_GROUPS,
};

/** @type {ReturnType<typeof neon> | null} */
let cachedSql = null;

function getSql() {
  const url = (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()) || '';
  if (!url) {
    throw new Error(
      '環境変数 DATABASE_URL が未設定です。プロジェクト直下の .env.local に NEON の接続文字列を記載してから開発サーバー（npm run vercel:dev）を再起動してください。',
    );
  }
  if (!cachedSql) {
    cachedSql = neon(url);
  }
  return cachedSql;
}

let schemaEnsured = false;

async function ensureSchema(sql) {
  if (schemaEnsured) {
    return;
  }
  await sql.query(
    `
    CREATE TABLE IF NOT EXISTS state (
      id INTEGER PRIMARY KEY,
      members JSONB NOT NULL DEFAULT '[]'::jsonb,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    `,
  );
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
  await sql.query(
    `
    INSERT INTO state (id, members, settings)
    SELECT 1,
      ($1)::jsonb,
      ($2)::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM state WHERE id = 1);
    `,
    [JSON.stringify(DEFAULT_MEMBERS), JSON.stringify(DEFAULT_SETTINGS)],
  );
  schemaEnsured = true;
}

/** @returns {{ start: string, end: string }} */
function monthBounds(monthYYYYMM) {
  const parts = `${monthYYYYMM}`.trim().split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) {
    throw new Error('month は YYYY-MM 形式である必要があります');
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

function ok(res, payload) {
  res.status(200).json({ status: 'ok', ...payload });
}

function err(res, message, status = 400) {
  res.status(status).json({ status: 'error', message });
}

async function dispatch(sql, payload) {
  const action = (payload.action || '').trim();
  switch (action) {
    case 'getMembers':
      return handleGetMembers(sql);
    case 'getSettings':
      return handleGetSettings(sql);
    case 'getRecords':
      return handleGetRecords(sql, payload);
    case 'saveRecord':
      return handleSaveRecord(sql, payload);
    case 'saveMembers':
      return handleSaveMembers(sql, payload);
    case 'saveSettings':
      return handleSaveSettings(sql, payload);
    case 'deleteRecord':
      return handleDeleteRecord(sql, payload);
    default:
      throw new Error('不明な action: ' + (action || '(空)'));
  }
}

async function handleGetMembers(sql) {
  const rows = await sql.query('SELECT members FROM state WHERE id = 1 LIMIT 1', []);
  const raw = rows[0]?.members;
  /** @type {string[]} */
  const members = Array.isArray(raw)
    ? raw.map((/** @type {*} */ x) => String(x)).filter(Boolean)
    : [...DEFAULT_MEMBERS];

  return { members };
}

async function handleGetSettings(sql) {
  const rows = await sql.query('SELECT settings FROM state WHERE id = 1 LIMIT 1', []);
  const raw = rows[0]?.settings;
  const settings =
    raw && typeof raw === 'object' ? raw : { ...DEFAULT_SETTINGS };
  const merged = {
    basic: [...(settings.basic ?? DEFAULT_SETTINGS.basic)],
    seikinn: [...(settings.seikinn ?? DEFAULT_SETTINGS.seikinn)],
    unitPrice:
      typeof settings.unitPrice === 'number' ? settings.unitPrice : DEFAULT_SETTINGS.unitPrice,
    groups:
      Array.isArray(settings.groups) && settings.groups.length > 0
        ? settings.groups
        : DEFAULT_GROUPS,
  };
  return { settings: merged };
}

async function handleGetRecords(sql, payload) {
  const month = (payload.month || '').trim();
  const { start, end } = monthBounds(month);

  const rows = await sql.query(
    `
    SELECT payload
    FROM daily_records
    WHERE work_date >= ($1)::date AND work_date <= ($2)::date
    ORDER BY work_date ASC, member_name ASC;
    `,
    [start, end],
  );

  const records = rows.map((/** @type {{ payload: unknown }} */ r) => r.payload);
  return { records };
}

async function handleSaveRecord(sql, payload) {
  const record = payload;
  const name = String(record.name ?? '').trim();
  const date = String(record.date ?? '').trim();

  if (!name || !date) {
    throw new Error('name と date は必須です');
  }

  const payloadClean = JSON.parse(JSON.stringify(record));
  delete payloadClean.action;

  await sql.query(
    `
    INSERT INTO daily_records (work_date, member_name, payload)
    VALUES (($1)::date, $2, ($3)::jsonb)
    ON CONFLICT (work_date, member_name) DO UPDATE SET
      payload = EXCLUDED.payload;
    `,
    [date, name, JSON.stringify(payloadClean)],
  );

  return {};
}

async function handleSaveMembers(sql, payload) {
  let members = payload.members;

  if (typeof members === 'string') {
    try {
      members = JSON.parse(members);
    } catch (_) {
      throw new Error('members が不正な JSON です');
    }
  }
  if (!Array.isArray(members)) {
    throw new Error('members は配列である必要があります');
  }
  /** @type {string[]} */
  const list = members.map((/** @type {*} */ m) => String(m).trim()).filter(Boolean);

  await sql.query(`UPDATE state SET members = ($1)::jsonb WHERE id = 1;`, [
    JSON.stringify(list),
  ]);
  return {};
}

async function handleSaveSettings(sql, payload) {
  let settings = payload.settings;

  if (typeof settings === 'string') {
    try {
      settings = JSON.parse(settings);
    } catch (_) {
      throw new Error('settings が不正な JSON です');
    }
  }
  if (!settings || typeof settings !== 'object') {
    throw new Error('settings が不正です');
  }

  await sql.query(`UPDATE state SET settings = ($1)::jsonb WHERE id = 1;`, [
    JSON.stringify(settings),
  ]);
  return {};
}

async function handleDeleteRecord(sql, payload) {
  const name = String(payload.name ?? '').trim();
  const date = String(payload.date ?? '').trim();

  if (!name || !date) {
    throw new Error('name と date は必須です');
  }

  await sql.query(
    `DELETE FROM daily_records WHERE work_date = ($1)::date AND member_name = $2;`,
    [date, name],
  );

  return {};
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizeBody(body) {
  if (body == null || body === '') {
    return {};
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body || '{}');
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') {
    return { ...body };
  }
  return {};
}

async function execHandler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!['GET', 'POST'].includes(req.method || '')) {
    err(res, 'Method Not Allowed', 405);
    return undefined;
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);

    /** GET はクエリのみ。POST は JSON 本体を優先し、クエリで上書き可能。 */
    const payload = coerceArraysFromStrings(
      req.method === 'GET'
        ? { ...req.query }
        : { ...normalizeBody(req.body), ...req.query },
    );

    const result = await dispatch(sql, payload);
    ok(res, result);
    return undefined;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    err(res, message, 500);
    return undefined;
  }
}

/**
 * Apps Script と同様に、旧クライアントが配列／オブジェクトを JSON 文字列で送ってきても復元する
 */
function coerceArraysFromStrings(obj) {
  const out = { ...obj };
  for (const key of ['members', 'settings', 'records']) {
    const v = out[key];
    if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
      try {
        out[key] = JSON.parse(v);
      } catch {
        /** keep string */
      }
    }
  }
  return out;
}

module.exports = execHandler;
