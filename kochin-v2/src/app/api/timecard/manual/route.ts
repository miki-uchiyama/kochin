import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// アイコンタップによる打刻API（出勤・退勤をそれぞれ明示的に指定）
export async function POST(request: NextRequest) {
  try {
    const { member_id, type } = await request.json();

    if (!member_id || (type !== 'clock_in' && type !== 'clock_out')) {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
    }

    const member = await sql`SELECT name FROM members WHERE id = ${member_id}`;
    if (member.length === 0) {
      return NextResponse.json({ error: '利用者が見つかりません' }, { status: 404 });
    }
    const name = member[0].name;

    const today = new Date().toISOString().split('T')[0];

    const existing = await sql`
      SELECT * FROM timecard
      WHERE member_id = ${member_id}
      AND date = ${today}
    `;

    if (type === 'clock_in') {
      if (existing.length > 0 && existing[0].clock_in) {
        return NextResponse.json({ error: 'すでに出勤打刻済みです' }, { status: 400 });
      }
      if (existing.length === 0) {
        await sql`
          INSERT INTO timecard (member_id, clock_in, date)
          VALUES (${member_id}, NOW(), ${today})
        `;
      } else {
        await sql`
          UPDATE timecard SET clock_in = NOW()
          WHERE member_id = ${member_id} AND date = ${today}
        `;
      }
      return NextResponse.json({ type: 'clock_in', name });
    } else {
      if (existing.length === 0 || !existing[0].clock_in) {
        return NextResponse.json({ error: 'まだ出勤打刻がありません' }, { status: 400 });
      }
      if (existing[0].clock_out) {
        return NextResponse.json({ error: 'すでに退勤打刻済みです' }, { status: 400 });
      }
      await sql`
        UPDATE timecard SET clock_out = NOW()
        WHERE member_id = ${member_id} AND date = ${today}
      `;
      return NextResponse.json({ type: 'clock_out', name });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
