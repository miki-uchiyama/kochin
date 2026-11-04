import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 指定日の打刻一覧を取得（在籍中の利用者のみ表示、未打刻も含む）
// 時刻はDBでUTCとして保存されているので、"…Z" 付きの文字列で返す
// （サーバーのタイムゾーンに左右されないようにするため）
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

    // 個別支援記録（ポータル）から、予定外欠席の理由と確認内容を取得して付ける
    // ポータルが止まっていても打刻の表示は止めないよう、失敗しても空で続ける
    const absenceMap = new Map<string, { reason: string; note: string }>();
    try {
      const portalUrl = process.env.PORTAL_URL ?? 'https://mams-hug-portal.vercel.app';
      const res = await fetch(`${portalUrl}/api/support/basic?date=${date}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const supports = await res.json();
        if (Array.isArray(supports)) {
          for (const s of supports) {
            if (s.attendance === '欠席' && s.absence_type === '予定外欠席') {
              // 姓と名の間のスペース（半角・全角）の違いを無視して突き合わせる
              const key = String(s.member_name ?? '').replace(/[\s\u3000]/g, '');
              absenceMap.set(key, {
                reason: s.absence_reason ?? '',
                note: s.absence_reason_other ?? '',
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('個別支援記録の取得に失敗:', e);
    }

    const withAbsence = records.map((r) => {
      const key = String(r.name ?? '').replace(/[\s\u3000]/g, '');
      const a = absenceMap.get(key);
      return {
        ...r,
        absence_reason: a ? a.reason : null,
        absence_note: a ? a.note : null,
      };
    });

    return NextResponse.json(withAbsence);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
