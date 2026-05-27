import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) return NextResponse.json([]);

  const records = await sql`
  SELECT 
    dr.id,
    dr.member_id,
    m.name,
    dr.absent,
    dr.am_absent,
    dr.pm_absent,
    dr.am_group_id,
    dr.am_hours,
    dr.am_memo,
    dr.pm_group_id,
    dr.pm_hours,
    dr.pm_memo,
    am_scores.s1 as am_s1, am_scores.s2 as am_s2, am_scores.s3 as am_s3, am_scores.s4 as am_s4, am_scores.s5 as am_s5,
    pm_scores.s1 as pm_s1, pm_scores.s2 as pm_s2, pm_scores.s3 as pm_s3, pm_scores.s4 as pm_s4, pm_scores.s5 as pm_s5,
    life_scores.s1 as life_s1, life_scores.s2 as life_s2, life_scores.s3 as life_s3, life_scores.s4 as life_s4
  FROM daily_records_new dr
  JOIN members m ON m.id = dr.member_id
  LEFT JOIN scores am_scores ON am_scores.record_id = dr.id AND am_scores.period = 'am'
  LEFT JOIN scores pm_scores ON pm_scores.record_id = dr.id AND pm_scores.period = 'pm'
  LEFT JOIN scores life_scores ON life_scores.record_id = dr.id AND life_scores.period = 'life'
  WHERE dr.date = ${date}
  ORDER BY m.name
`;

  return NextResponse.json(records);
}

export async function PUT(request: Request) {
    const records = await request.json();
    
    for (const r of records) {
        await sql`
        UPDATE daily_records_new SET
          am_group_id = ${r.am_group_id},
          am_hours = ${r.am_hours},
          am_memo = ${r.am_memo || null},
          pm_group_id = ${r.pm_group_id},
          pm_hours = ${r.pm_hours},
          pm_memo = ${r.pm_memo || null},
          am_absent = ${r.am_absent},
          pm_absent = ${r.pm_absent}
        WHERE id = ${r.id}
      `;
  
      await sql`
        UPDATE scores SET
          s1 = ${r.am_s1}, s2 = ${r.am_s2}, s3 = ${r.am_s3}, s4 = ${r.am_s4}, s5 = ${r.am_s5}
        WHERE record_id = ${r.id} AND period = 'am'
      `;
  
      await sql`
        UPDATE scores SET
          s1 = ${r.pm_s1}, s2 = ${r.pm_s2}, s3 = ${r.pm_s3}, s4 = ${r.pm_s4}, s5 = ${r.pm_s5}
        WHERE record_id = ${r.id} AND period = 'pm'
      `;
  
      await sql`
        UPDATE scores SET
          s1 = ${r.life_s1}, s2 = ${r.life_s2}, s3 = ${r.life_s3}, s4 = ${r.life_s4}
        WHERE record_id = ${r.id} AND period = 'life'
      `;
    }
  
    return NextResponse.json({ ok: true });
  }

  export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false });
    await sql`DELETE FROM scores WHERE record_id = ${id}`;
    await sql`DELETE FROM daily_records_new WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }