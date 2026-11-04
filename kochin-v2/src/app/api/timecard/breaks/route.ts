import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { jstToUtcWall } from '../jst';

const sql = neon(process.env.DATABASE_URL!);

type BreakInput = { start: string; end: string | null };

// その日の休憩を、受け取った内容にまるごと入れ替える（手動の修正用）
// ・時刻は日本時間の "HH:MM" で受け取り、DBにはUTCで保存する
// ・終了が空の休憩は「休憩中」として保存する
// ・削除と追加は1つのまとまり（トランザクション）で行い、途中で失敗したら元に戻る
export async function POST(request: NextRequest) {
  try {
    const { member_id, date, breaks } = await request.json();

    if (!member_id || !date || !Array.isArray(breaks)) {
      return NextResponse.json({ error: '利用者と日付と休憩が必要です' }, { status: 400 });
    }

    const list: BreakInput[] = breaks;
    const hhmm = /^\d{2}:\d{2}$/;

    for (const b of list) {
      if (!b.start || !hhmm.test(b.start) || (b.end && !hhmm.test(b.end))) {
        return NextResponse.json({ error: '休憩の時刻が正しくありません' }, { status: 400 });
      }
      if (b.end && b.end <= b.start) {
        return NextResponse.json({ error: '休憩の終了は開始より後にしてください' }, { status: 400 });
      }
    }

    await sql.transaction([
      sql`DELETE FROM breaks WHERE member_id = ${member_id} AND date = ${date}`,
      ...list.map(
        (b) => sql`
          INSERT INTO breaks (member_id, date, break_start, break_end)
          VALUES (
            ${member_id},
            ${date},
            ${jstToUtcWall(date, b.start)},
            ${b.end ? jstToUtcWall(date, b.end) : null}
          )
        `
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
