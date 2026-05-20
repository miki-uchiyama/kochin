import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const { member_id, date, absent } = body;

  if (absent === true) {
    const existing = await sql`
      SELECT id FROM daily_records_new 
      WHERE member_id = ${member_id} AND date = ${date}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE daily_records_new 
        SET absent = true, am_absent = true, pm_absent = true
        WHERE member_id = ${member_id} AND date = ${date}
      `;
    } else {
      await sql`
        INSERT INTO daily_records_new (member_id, date, absent, am_absent, pm_absent)
        VALUES (${member_id}, ${date}, true, true, true)
      `;
    }
    return NextResponse.json({ ok: true });

  } else if (absent === false) {
    await sql`
      UPDATE daily_records_new 
      SET absent = false, am_absent = false, pm_absent = false
      WHERE member_id = ${member_id} AND date = ${date}
    `;
    return NextResponse.json({ ok: true });
  }

  // 午前・午後の入力
  const { period, group_id, hours, scores } = body;

  const existing = await sql`
    SELECT id FROM daily_records_new 
    WHERE member_id = ${member_id} AND date = ${date}
  `;

  let recordId;

  if (existing.length > 0) {
    recordId = existing[0].id;
    if (period === 'am') {
      await sql`
        UPDATE daily_records_new SET
          am_group_id = ${group_id}, am_hours = ${hours}, am_absent = ${body.am_absent || false}
        WHERE id = ${recordId}
      `;
    } else if (period === 'pm') {
      await sql`
        UPDATE daily_records_new SET
          pm_group_id = ${group_id}, pm_hours = ${hours}, pm_absent = ${body.pm_absent || false}
        WHERE id = ${recordId}
      `;
    }
  } else {
    if (period === 'am') {
      const result = await sql`
        INSERT INTO daily_records_new (member_id, date, am_group_id, am_hours)
        VALUES (${member_id}, ${date}, ${group_id}, ${hours})
        RETURNING id
      `;
      recordId = result[0].id;
    } else if (period === 'pm') {
      const result = await sql`
        INSERT INTO daily_records_new (member_id, date, pm_group_id, pm_hours)
        VALUES (${member_id}, ${date}, ${group_id}, ${hours})
        RETURNING id
      `;
      recordId = result[0].id;
    }
  }

  if (recordId && scores) {
    const existing_scores = await sql`
      SELECT id FROM scores WHERE record_id = ${recordId} AND period = ${period}
    `;
    if (existing_scores.length > 0) {
      await sql`
        UPDATE scores SET s1=${scores[0]}, s2=${scores[1]}, s3=${scores[2]}, s4=${scores[3]}, s5=${scores[4]}
        WHERE record_id = ${recordId} AND period = ${period}
      `;
    } else {
      await sql`
        INSERT INTO scores (record_id, period, s1, s2, s3, s4, s5)
        VALUES (${recordId}, ${period}, ${scores[0]}, ${scores[1]}, ${scores[2]}, ${scores[3]}, ${scores[4]})
      `;
    }
  }

  return NextResponse.json({ ok: true });
}