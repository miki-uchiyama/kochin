import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 指定日の打刻一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '日付を指定してください' }, { status: 400 });
    }

    const records = await sql`
      SELECT t.id, t.member_id, m.name, t.clock_in, t.clock_out
      FROM timecard t
      JOIN members m ON t.member_id = m.id
      WHERE t.date = ${date}
      ORDER BY m.name
    `;

    return NextResponse.json(records);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}