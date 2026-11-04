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
    // 時刻はDBでUTCとして保存されているので、"…Z" 付きの文字列で返す
    const records = await sql`
      SELECT
        TO_CHAR(t.date, 'YYYY-MM-DD') AS date,
        to_char(t.clock_in, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS clock_in,
        to_char(t.clock_out, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS clock_out,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'break_start', to_char(b.break_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'break_end', to_char(b.break_end, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              )
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

    // 個別支援記録（ポータル）から、この利用者の予定外欠席の理由を月ぶんまとめて取得する
    // ポータルが止まっていても打刻の表示は止めないよう、失敗しても空で続ける
    const absences: Record<string, { type: string; reason: string }> = {};
    try {
      const found = await sql`SELECT name FROM members WHERE id = ${member_id}`;
      const norm = (v: unknown) => String(v ?? '').replace(/[\s\u3000]/g, '');
      const target = found.length > 0 ? norm(found[0].name) : '';
      if (target) {
        const portalUrl = process.env.PORTAL_URL ?? 'https://mams-hug-portal.vercel.app';
        const res = await fetch(`${portalUrl}/api/support/basic?date=${month}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const supports = await res.json();
          if (Array.isArray(supports)) {
            for (const s of supports) {
              if (
                s.attendance === '欠席' &&
                (s.absence_type === '予定外欠席' || s.absence_type === '予定欠席') &&
                norm(s.member_name) === target
              ) {
                absences[String(s.record_date).slice(0, 10)] = {
                  type: s.absence_type,
                  reason: s.absence_reason ?? '',
                };
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('個別支援記録の取得に失敗:', e);
    }

    // 公休（工賃システムと同じデータベースに入っている）をその月ぶん取得する
    // 失敗しても打刻の表示は止めない
    let dayOffs: string[] = [];
    try {
      const rows = await sql`
        SELECT to_char(date, 'YYYY-MM-DD') AS date
        FROM daily_records_new
        WHERE member_id = ${member_id}
          AND day_off = true
          AND to_char(date, 'YYYY-MM') = ${month}
      `;
      dayOffs = rows.map((r) => String(r.date));
    } catch (e) {
      console.error('公休の取得に失敗:', e);
    }

    return NextResponse.json({ records, absences, dayOffs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
