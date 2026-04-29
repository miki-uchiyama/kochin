/**
 * Neon 移行・インポート用ツール共通: DATABASE_URL が無いとき .env を読む
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
