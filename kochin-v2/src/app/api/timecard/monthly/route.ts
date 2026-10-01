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
      const members = await sql`SELECT id, name, active FROM members ORDER BY name`;
      return NextResponse.json({ members });
    }

    // date はタイムゾーン変換でずれないよう、文字列("YYYY-MM-DD")として取得する
    const records = await sql`
      SELECT
        TO_CHAR(t.date, 'YYYY-MM-DD') AS date,
        t.clock_in,
        t.clock_out,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('break_start', b.break_start, 'break_end', b.break_end)
              ORDER BY b.break_start
            )
            FROM breaks b
            WHERE b.member_id = t.member_id AND b.date = t.date
          ),
          '[]'
        ) AS breaks
      FROM timecard t
      WHERE t.member_id = ${member_id}
      AND t.date >= ${month + '-01'}
      AND t.date < (${month + '-01'}::date + INTERVAL '1 month')
      ORDER BY t.date
    `;

    return NextResponse.json({ records });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
