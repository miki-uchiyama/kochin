import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const member_id = searchParams.get('member_id');
  const month = searchParams.get('month');

  if (!member_id || !month) return NextResponse.json([]);

  const records = await sql`
    SELECT 
      dr.id,
      dr.date,
      dr.absent,
      dr.am_absent,
      dr.pm_absent,
      dr.am_group_id,
      dr.am_hours,
      dr.pm_group_id,
      dr.pm_hours,
      am_scores.s1 as am_s1, am_scores.s2 as am_s2, am_scores.s3 as am_s3, am_scores.s4 as am_s4, am_scores.s5 as am_s5,
      pm_scores.s1 as pm_s1, pm_scores.s2 as pm_s2, pm_scores.s3 as pm_s3, pm_scores.s4 as pm_s4, pm_scores.s5 as pm_s5,
      life_scores.s1 as life_s1, life_scores.s2 as life_s2, life_scores.s3 as life_s3, life_scores.s4 as life_s4
    FROM daily_records_new dr
    LEFT JOIN scores am_scores ON am_scores.record_id = dr.id AND am_scores.period = 'am'
    LEFT JOIN scores pm_scores ON pm_scores.record_id = dr.id AND pm_scores.period = 'pm'
    LEFT JOIN scores life_scores ON life_scores.record_id = dr.id AND life_scores.period = 'life'
    WHERE dr.member_id = ${member_id}
    AND to_char(dr.date, 'YYYY-MM') = ${month}
    ORDER BY dr.date
  `;

  return NextResponse.json(records);
}