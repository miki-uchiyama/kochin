'use client';

import { useState, useEffect } from 'react';

type Summary = {
  member_id: number;
  name: string;
  work_days: number;
  absent_days: number;
  ability_pay: number;
  base_pay: number;
  attendance_bonus: number;
  total: number;
};

export default function SummaryPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/summary?month=${month}`)
      .then(r => r.json())
      .then(data => {
        setSummaries(data);
        setLoading(false);
      });
  }, [month]);

  return (
    <main style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>集計</h1>

      <div style={{ marginBottom: '20px' }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '8px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }} />
      </div>

      {loading && <p>読み込み中...</p>}

      {!loading && summaries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={th}>氏名</th>
                <th style={th}>出勤日数</th>
                <th style={th}>欠席日数</th>
                <th style={th}>能力給</th>
                <th style={th}>基本給</th>
                <th style={th}>精勤手当</th>
                <th style={th}>合計</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(s => (
                <tr key={s.member_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{s.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{s.work_days}日</td>
                  <td style={{ ...td, textAlign: 'right' }}>{s.absent_days}日</td>
                  <td style={{ ...td, textAlign: 'right' }}>{s.ability_pay.toLocaleString()}円</td>
                  <td style={{ ...td, textAlign: 'right' }}>{s.base_pay.toLocaleString()}円</td>
                  <td style={{ ...td, textAlign: 'right' }}>{s.attendance_bonus.toLocaleString()}円</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 'bold' }}>{s.total.toLocaleString()}円</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && summaries.length === 0 && (
        <p style={{ color: '#999' }}>データがありません</p>
      )}
    </main>
  );
}

const th = { padding: '12px 8px', textAlign: 'left' as const, fontSize: '15px', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const td = { padding: '8px', verticalAlign: 'middle' as const, fontSize: '15px' };