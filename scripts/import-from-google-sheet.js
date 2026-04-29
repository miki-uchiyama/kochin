/**
 * .env に記載したサービスアカウント認証で Google Sheets API から利用者列を取得し、Neon に書き込みます。
 *
 * 準備:
 * 1) Google Cloud でプロジェクトを作成 → API とサービス → ライブラリ → Google Sheets API を有効化
 * 2) サービスアカウント作成 → 鍵（JSON）をダウンロード
 * 3) 対象スプレッドシートを「共有」し、サービスアカウントのメール（…@…iam.gserviceaccount.com）に閲覧権限
 * 4) .env.local などに追加:
 *      GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
 *    （または GOOGLE_SERVICE_ACCOUNT_JSON に JSON 文字列一式 ※改行に注意）
 *      GOOGLE_SPREADSHEET_ID=1E42kBcSxcTnjq12TVyF72QOZCQsuEL1Cd4o0vxE0VdU
 *      GOOGLE_SHEET_NAME=利用者
 *      GOOGLE_SHEET_RANGE=A2:A500
 *    DATABASE_URL=（既存の Neon 接続）
 *
 * 実行:
 *   node scripts/import-from-google-sheet.js
 *   node scripts/import-from-google-sheet.js --dry-run
 */

require('./_load-env-neon');

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

async function getAuth() {
  const jsonInline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonInline && jsonInline.trim()) {
    const creds = JSON.parse(jsonInline);
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    return new google.auth.GoogleAuth({
      keyFile: path.resolve(keyPath),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS（JSON ファイルのパス）または GOOGLE_SERVICE_ACCOUNT_JSON を設定してください。',
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');

  const spreadsheetId =
    process.env.GOOGLE_SPREADSHEET_ID || '1E42kBcSxcTnjq12TVyF72QOZCQsuEL1Cd4o0vxE0VdU';
  let range = (process.env.GOOGLE_SHEET_RANGE || '').trim();
  if (!range) {
    const name = process.env.GOOGLE_SHEET_NAME || '利用者';
    const esc = `'${String(name).replace(/'/g, "''")}'`;
    range = `${esc}!A2:A3000`;
  }

  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('スプレッドシート読み取り…', spreadsheetId.slice(0, 8) + '… range:', range);
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = resp.data.values || [];
  /** @type {string[]} */
  const names = [];
  const seen = new Set();
  for (const row of values) {
    const cell = row && row[0];
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
    console.error(
      '名前が読み取れませんでした。GOOGLE_SHEET_RANGE が利用者名列を指しているか（例 A2:A）確認してください。',
    );
    process.exit(1);
  }

  console.log('件数:', names.length);
  console.log('例:', names.slice(0, 8).join('、'), names.length > 8 ? '…' : '');

  if (dryRun) {
    console.log('[dry-run] Neon には書き込みません');
    return;
  }

  const url = (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()) || '';
  if (!url) {
    throw new Error('DATABASE_URL が未設定です');
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(url);

  await sql.query(`UPDATE state SET members = ($1)::jsonb WHERE id = 1;`, [JSON.stringify(names)]);
  console.log('Neon state.members を更新しました');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
