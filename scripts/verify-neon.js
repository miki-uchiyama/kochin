/**
 * Neon に state / daily_records と初期データがあるか確認（接続文字列は標準出力しない）
 * 実行: node scripts/verify-neon.js
 */
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  for (const name of ['.env.local', '.env.development.local', '.env']) {
    const fp = path.join(process.cwd(), name);
    if (fs.existsSync(fp)) {
      require('dotenv').config({ path: fp });
      break;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL が未設定です。.env.local を確認してください');
  process.exit(1);
}

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('[1] テーブル存在確認 (information_schema)\n');

  const tables = await sql.query(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('state', 'daily_records')
    ORDER BY table_name;
    `,
    [],
  );
  console.log('tables:', tables.map((/** @type {{ table_name: string }} */ r) => r.table_name).join(', ') || '(なし)');
  console.log('');

  console.log('[2] state 行データ\n');

  try {
    const rows = await sql.query('SELECT id, members, settings FROM state WHERE id = 1', []);
    if (!rows.length) {
      console.log('state に id=1 の行がありません（INSERT が未実行の可能性）。');
    } else {
      const row = rows[0];
      const memb = row.members;
      console.log(
        '- id:',
        row.id,
        '| members 型:',
        Array.isArray(memb)
          ? 'array'
          : typeof memb === 'object' && memb !== null
            ? 'object'
            : typeof memb,
        '| len:',
        Array.isArray(memb)
          ? memb.length
          : memb && typeof memb === 'object'
            ? '(object・配列ではない)'
            : 'n/a',
      );
      if (Array.isArray(memb) && memb.length) {
        console.log('- 利用者サンプル(先頭3件):', memb.slice(0, 3).map(String));
      }
      const set = row.settings;
      console.log('- settings が object:', typeof set === 'object' && set !== null);
      if (set && typeof set === 'object' && !Array.isArray(set)) {
        console.log('- settings.unitPrice:', set.unitPrice, '| basic:', set.basic?.length ?? 'missing');
      }
    }
  } catch (e) {
    console.error('state 読み取りエラー:', e instanceof Error ? e.message : e);
  }

  console.log('\n[3] daily_records\n');

  try {
    const cnt = await sql.query('SELECT COUNT(*)::int AS c FROM daily_records', []);
    console.log('- 総件数:', cnt[0]?.c ?? '?');
    const recent = await sql.query(
      'SELECT work_date, member_name FROM daily_records ORDER BY work_date DESC LIMIT 5',
      [],
    );
    if (recent.length) {
      console.log('- 最新5件:');
      for (const /** @type {{ work_date: string, member_name: string }} */ r of recent) {
        console.log('  ', String(r.work_date).slice(0, 10), r.member_name);
      }
    } else {
      console.log('- (まだ1件もありません。集計には「入力」後のデータが必要です)');
    }
  } catch (e) {
    console.error('daily_records 読み取りエラー:', e instanceof Error ? e.message : e);
  }

  console.log('\n完了（接続情報は出力していません）');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
