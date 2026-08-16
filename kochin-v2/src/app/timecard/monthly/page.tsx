'use client';

import { useEffect, useState } from 'react';

type Member = { id: number; name: string };
type Record = { date: string; clock_in: string | null; clock_out: string | null };

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function formatTime(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function getDaysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

export default function MonthlyTimecardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/timecard/monthly')
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []));
  }, []);

  useEffect(() => {
    if (!memberId || !month) return;
    setLoading(true);
    fetch(`/api/timecard/monthly?member_id=${memberId}&month=${month}`)
      .then((res) => res.json())
      .then((data) => setRecords(data.records || []))
      .finally(() => setLoading(false));
  }, [memberId, month]);

  const recordMap = new Map(records.map((r) => [r.date, r]));
  const days = month ? getDaysInMonth(month) : [];
  const attendedCount = records.filter((r) => r.clock_in).length;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
        月別タイムカード
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '12px', fontSize: '18px' }}
        >
          <option value="">利用者を選択してください</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '12px', fontSize: '18px' }}
        />
      </div>

      {!memberId && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>
          利用者を選択してください
        </p>
      )}

      {memberId && loading && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>読み込み中...</p>
      )}

      {memberId && !loading && (
        <>
          <div style={{
            backgroundColor: '#e07b00', color: 'white', borderRadius: '8px',
            padding: '10px 16px', marginBottom: '12px', fontWeight: 'bold', textAlign: 'center'
          }}>
            出勤日数：{attendedCount}日
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {days.map((date) => {
              const r = recordMap.get(date);
              const d = new Date(date);
              const weekday = WEEKDAYS[d.getDay()];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const clockIn = r ? formatTime(r.clock_in) : null;
              const clockOut = r ? formatTime(r.clock_out) : null;

              return (
                <div
                  key={date}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{
                    fontWeight: 'bold',
                    color: isWeekend ? '#e07b00' : '#333',
                    minWidth: '70px',
                  }}>
                    {Number(date.split('-')[2])}日({weekday})
                  </div>
                  <div style={{ fontSize: '14px', color: clockIn ? '#333' : '#bbb' }}>
                    {clockIn ? `出勤 ${clockIn}` : '未打刻'}
                    {clockOut ? `　退勤 ${clockOut}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}