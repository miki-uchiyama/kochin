import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month) return NextResponse.json([]);

  // 年度開始月を計算（4月始まり）
  const [year, mon] = month.split('-').map(Number);
  const fiscalStartYear = mon >= 4 ? year : year - 1;
  const fiscalStartMonth = `${fiscalStartYear}-04`;

  // 設定値を取得
  const settingsRows = await sql`SELECT key, value FROM settings`;
  const settings: Record<string, number> = {};
  settingsRows.forEach(r => { settings[r.key] = Number(r.value); });

  const unitPrice = settings['unit_price'];

  // 今月のデータを取得
  const records = await sql`
    SELECT 
      m.id as member_id,
      m.name,
      dr.date,
      dr.absent,
      dr.am_absent,
      dr.pm_absent,
      dr.am_group_id,
      dr.am_hours,
      dr.pm_group_id,
      dr.pm_hours,
      g_am.coefficient as am_coef,
      g_pm.coefficient as pm_coef,
      am_scores.s1 + am_scores.s2 + am_scores.s3 + am_scores.s4 + am_scores.s5 as am_total,
      pm_scores.s1 + pm_scores.s2 + pm_scores.s3 + pm_scores.s4 + pm_scores.s5 as pm_total,
      life_scores.s1 + life_scores.s2 + life_scores.s3 + life_scores.s4 as life_total
    FROM daily_records_new dr
    JOIN members m ON m.id = dr.member_id
    LEFT JOIN groups g_am ON g_am.id = dr.am_group_id
    LEFT JOIN groups g_pm ON g_pm.id = dr.pm_group_id
    LEFT JOIN scores am_scores ON am_scores.record_id = dr.id AND am_scores.period = 'am'
    LEFT JOIN scores pm_scores ON pm_scores.record_id = dr.id AND pm_scores.period = 'pm'
    LEFT JOIN scores life_scores ON life_scores.record_id = dr.id AND life_scores.period = 'life'
    WHERE to_char(dr.date, 'YYYY-MM') = ${month}
    ORDER BY m.name, dr.date
  `;

  // 年度累積データを取得（4月〜表示月）
  const yearlyRecords = await sql`
    SELECT 
      m.id as member_id,
      dr.date,
      dr.absent,
      dr.am_absent,
      dr.pm_absent,
      dr.am_group_id,
      dr.am_hours,
      dr.pm_group_id,
      dr.pm_hours,
      g_am.coefficient as am_coef,
      g_pm.coefficient as pm_coef,
      am_scores.s1 + am_scores.s2 + am_scores.s3 + am_scores.s4 + am_scores.s5 as am_total,
      pm_scores.s1 + pm_scores.s2 + pm_scores.s3 + pm_scores.s4 + pm_scores.s5 as pm_total,
      life_scores.s1 + life_scores.s2 + life_scores.s3 + life_scores.s4 as life_total
    FROM daily_records_new dr
    JOIN members m ON m.id = dr.member_id
    LEFT JOIN groups g_am ON g_am.id = dr.am_group_id
    LEFT JOIN groups g_pm ON g_pm.id = dr.pm_group_id
    LEFT JOIN scores am_scores ON am_scores.record_id = dr.id AND am_scores.period = 'am'
    LEFT JOIN scores pm_scores ON pm_scores.record_id = dr.id AND pm_scores.period = 'pm'
    LEFT JOIN scores life_scores ON life_scores.record_id = dr.id AND life_scores.period = 'life'
    WHERE to_char(dr.date, 'YYYY-MM') >= ${fiscalStartMonth}
      AND to_char(dr.date, 'YYYY-MM') <= ${month}
  `;

  // 過去3か月データを取得
  const threeMonthsAgo = new Date(year, mon - 1 - 3, 1);
  const threeMonthStart = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

  const threeMonthRecords = await sql`
    SELECT dr.date, dr.absent
    FROM daily_records_new dr
    WHERE to_char(dr.date, 'YYYY-MM') >= ${threeMonthStart}
      AND to_char(dr.date, 'YYYY-MM') <= ${month}
  `;

  // 年度累積の計算
  const yearlyWorkDaysTotal = yearlyRecords.filter(r => !r.absent).length;
  const yearlyDates = [...new Set(yearlyRecords.map(r => String(r.date)))];
  const yearlyOpenDays = yearlyDates.length;
  const avgUsers = yearlyOpenDays > 0 ? Math.round((yearlyWorkDaysTotal / yearlyOpenDays) * 10) / 10 : 0;

  // 経過月数（4月からの月数）
  const elapsedMonths = (year - fiscalStartYear) * 12 + (mon - 4);

  // 3か月平均利用者数
  const threeMonthWorkDays = threeMonthRecords.filter(r => !r.absent).length;
  const threeMonthDates = [...new Set(threeMonthRecords.map(r => String(r.date)))];
  const threeMonthOpenDays = threeMonthDates.length;
  const threeMonthAvgUsers = threeMonthOpenDays > 0 ? Math.round((threeMonthWorkDays / threeMonthOpenDays) * 10) / 10 : 0;

  // 定員20人に対する割合
  const capacity = 20;
  const threeMonthRate = threeMonthAvgUsers / capacity;
  let alert: 'none' | 'yellow' | 'red' = 'none';
  if (threeMonthRate >= 1.15) alert = 'red';
  else if (threeMonthRate >= 1.00) alert = 'yellow';

  // 利用者ごとに集計
  const memberMap: Record<number, {
    member_id: number;
    name: string;
    work_days: number;
    absent_days: number;
    ability_pay: number;
    base_pay: number;
    attendance_bonus: number;
    input_count: number;
    total: number;
  }> = {};

  records.forEach(r => {
    if (!memberMap[r.member_id]) {
      memberMap[r.member_id] = {
        member_id: r.member_id,
        name: r.name,
        work_days: 0,
        absent_days: 0,
        ability_pay: 0,
        base_pay: 0,
        attendance_bonus: 0,
        input_count: 0,
        total: 0,
      };
    }

    const m = memberMap[r.member_id];

    if (r.absent) {
      m.absent_days++;
    } else {
      m.work_days++;
      m.input_count++;

      if (!r.am_absent && r.am_total && r.am_coef && r.am_hours) {
        m.ability_pay += Number(r.am_coef) * Number(r.am_total) * unitPrice * Number(r.am_hours);
      }
      if (!r.pm_absent && r.pm_total && r.pm_coef && r.pm_hours) {
        m.ability_pay += Number(r.pm_coef) * Number(r.pm_total) * unitPrice * Number(r.pm_hours);
      }
      if (r.life_total) {
        m.ability_pay += Number(r.life_total) * unitPrice;
      }
    }
  });

  // 基本給・精勤手当の計算
  let yearlyTotalPay = 0;
  Object.values(memberMap).forEach(m => {
    const absent = m.absent_days;
    let basePayPerDay: number;
    let attendanceBonus: number;

    if (absent <= 2) {
      basePayPerDay = settings['base_pay_0_2'];
      attendanceBonus = settings['attendance_bonus_0_2'];
    } else if (absent <= 5) {
      basePayPerDay = settings['base_pay_3_5'];
      attendanceBonus = settings['attendance_bonus_3_5'];
    } else {
      basePayPerDay = settings['base_pay_6'];
      attendanceBonus = settings['attendance_bonus_6'];
    }

    m.base_pay = basePayPerDay * m.work_days;
    m.attendance_bonus = attendanceBonus;
    m.ability_pay = Math.round(m.ability_pay);
    m.total = m.base_pay + m.attendance_bonus + m.ability_pay;
    yearlyTotalPay += m.total;
  });

  // 平均工賃（年度累積）
  const avgMonthlyPay = avgUsers > 0 && elapsedMonths > 0
    ? Math.round(yearlyTotalPay / avgUsers / elapsedMonths)
    : 0;

  return NextResponse.json({
    members: Object.values(memberMap),
    stats: {
      avgUsers,
      avgMonthlyPay,
      threeMonthAvgUsers,
      threeMonthRate: Math.round(threeMonthRate * 1000) / 10,
      alert,
      elapsedMonths,
    }
  });
}