import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 出退勤時刻を手動で修正・登録する
export async function POST(request: NextRequest) {
  try {
    const { member_id, date, clock_in, clock_out } = await request.json();

    if (!member_id || !date) {
      return NextResponse.json({ error: '利用者と日付が必要です' }, { status: 400 });
    }

    // clock_in / clock_out は "HH:MM" 形式で受け取り、日付と組み合わせてTIMESTAMPにする
    const clockInValue = clock_in ? `${date} ${clock_in}:00` : null;
    const clockOutValue = clock_out ? `${date} ${clock_out}:00` : null;

    // すでに記録があるか確認
    const existing = await sql`
      SELECT id FROM timecard WHERE member_id = ${member_id} AND date = ${date}
    `;

    if (existing.length === 0) {
      // 新規作成
      await sql`
        INSERT INTO timecard (member_id, date, clock_in, clock_out)
        VALUES (${member_id}, ${date}, ${clockInValue}, ${clockOutValue})
      `;
    } else {
      // 更新
      await sql`
        UPDATE timecard
        SET clock_in = ${clockInValue}, clock_out = ${clockOutValue}
        WHERE member_id = ${member_id} AND date = ${date}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}