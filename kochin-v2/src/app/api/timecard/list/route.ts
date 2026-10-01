import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 指定日の打刻一覧を取得（在籍中の利用者のみ表示、未打刻も含む）
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
        t.clock_out,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('break_start', b.break_start, 'break_end', b.break_end)
              ORDER BY b.break_start
            )
            FROM breaks b
            WHERE b.member_id = m.id AND b.date = ${date}
          ),
          '[]'
        ) AS breaks
      FROM members m
      LEFT JOIN timecard t
        ON t.member_id = m.id AND t.date = ${date}
      WHERE m.active IS DISTINCT FROM false
      ORDER BY m.name
    `;

    return NextResponse.json(records);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
