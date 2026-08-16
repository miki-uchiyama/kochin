'use client';

import { useEffect, useState } from 'react';

type Record = {
  id: number;
  member_id: number;
  name: string;
  clock_in: string | null;
  clock_out: string | null;
};

function formatTime(value: string | null) {
  if (!value) return '未打刻';
  const d = new Date(value);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function TimecardListPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/timecard/list?date=${date}`)
      .then((res) => res.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
        タイムカード一覧
      </h1>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '18px',
            width: '100%',
          }}
        />
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>読み込み中...</p>
      )}

      {!loading && records.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>記録がありません</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {records.map((r) => (
          <div
            key={r.id}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '10px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              {r.name}
            </div>
            <div style={{ display: 'flex', gap: '20px', fontSize: '16px' }}>
              <div>
                <span style={{ color: '#888', marginRight: '6px' }}>出勤</span>
                <span style={{ fontWeight: 'bold' }}>{formatTime(r.clock_in)}</span>
              </div>
              <div>
                <span style={{ color: '#888', marginRight: '6px' }}>退勤</span>
                <span
                  style={{
                    fontWeight: 'bold',
                    color: r.clock_out ? '#000' : '#e07b00',
                  }}
                >
                  {r.clock_out ? formatTime(r.clock_out) : '未退勤'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}