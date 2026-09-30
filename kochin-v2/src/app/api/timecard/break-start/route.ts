import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 休憩開始
export async function POST(request: NextRequest) {
  try {
    const { member_id } = await request.json();

    if (!member_id) {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
    }

    const member = await sql`SELECT name FROM members WHERE id = ${member_id}`;
    if (member.length === 0) {
      return NextResponse.json({ error: '利用者が見つかりません' }, { status: 404 });
    }
    const name = member[0].name;

    const today = new Date().toISOString().split('T')[0];

    // すでに休憩中（終了していない休憩）がないか確認
    const openBreak = await sql`
      SELECT * FROM breaks
      WHERE member_id = ${member_id}
      AND date = ${today}
      AND break_end IS NULL
    `;

    if (openBreak.length > 0) {
      return NextResponse.json({ error: 'すでに休憩中です' }, { status: 400 });
    }

    await sql`
      INSERT INTO breaks (member_id, date, break_start)
      VALUES (${member_id}, ${today}, NOW())
    `;

    return NextResponse.json({ type: 'break_start', name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
