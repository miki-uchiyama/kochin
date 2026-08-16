import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 指定日の打刻一覧を取得（全利用者を表示、未打刻も含む）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '日付を指定してください' }, { status: 400 });
    }

    const records = await sql`
      SELECT
        m.id AS member_id,
        m.name,
        t.id AS timecard_id,
        t.clock_in,
        t.clock_out
      FROM members m
      LEFT JOIN timecard t
        ON t.member_id = m.id AND t.date = ${date}
      ORDER BY m.name
    `;

    return NextResponse.json(records);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}