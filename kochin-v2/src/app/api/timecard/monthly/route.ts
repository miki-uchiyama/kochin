import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 利用者一覧を取得（プルダウン用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const member_id = searchParams.get('member_id');
    const month = searchParams.get('month'); // 例: "2026-08"

    // memberとmonthが両方なければ、利用者一覧だけ返す
    if (!member_id || !month) {
      const members = await sql`SELECT id, name FROM members ORDER BY name`;
      return NextResponse.json({ members });
    }

    const records = await sql`
      SELECT date, clock_in, clock_out
      FROM timecard
      WHERE member_id = ${member_id}
      AND date >= ${month + '-01'}
      AND date < (${month + '-01'}::date + INTERVAL '1 month')
      ORDER BY date
    `;

    return NextResponse.json({ records });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}