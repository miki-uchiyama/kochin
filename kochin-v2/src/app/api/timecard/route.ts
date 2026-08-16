import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 打刻API
export async function POST(request: NextRequest) {
  try {
    const { card_id } = await request.json();

    // カードIDから利用者を検索
    const cards = await sql`
      SELECT fc.member_id, m.name
      FROM felica_cards fc
      JOIN members m ON fc.member_id = m.id
      WHERE fc.card_id = ${card_id}
    `;

    if (cards.length === 0) {
      return NextResponse.json({ error: '登録されていないカードです' }, { status: 404 });
    }

    const member = cards[0];
    const today = new Date().toISOString().split('T')[0];

    // 今日の打刻記録を確認
    const existing = await sql`
      SELECT * FROM timecard
      WHERE member_id = ${member.member_id}
      AND date = ${today}
    `;

    if (existing.length === 0) {
      // 出勤打刻
      await sql`
        INSERT INTO timecard (member_id, clock_in, date)
        VALUES (${member.member_id}, NOW(), ${today})
      `;
      return NextResponse.json({ type: 'clock_in', name: member.name });
    } else if (!existing[0].clock_out) {
      // 退勤打刻
      await sql`
        UPDATE timecard
        SET clock_out = NOW()
        WHERE member_id = ${member.member_id}
        AND date = ${today}
      `;
      return NextResponse.json({ type: 'clock_out', name: member.name });
    } else {
      return NextResponse.json({ error: '本日の打刻は完了しています' }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}