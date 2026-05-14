'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Member = { id: number; name: string };
type Record = {
  member_id: number; absent: boolean; am_absent: boolean; pm_absent: boolean;
  am_s1: number; pm_s1: number; life_s1: number;
};

export default function InputPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/members').then(r => r.json()).then(setMembers);
  }, []);

  useEffect(() => {
    fetch(`/api/records?date=${date}`).then(r => r.json()).then(setRecords);
  }, [date]);

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const getStatus = (memberId: number) => {
    const r = records.find(r => Number(r.member_id) === memberId);
    if (!r) return { label: '未入力', color: '#fff', textColor: '#333', border: '1px solid #ddd' };
    if (r.absent) return { label: '欠席', color: '#f5f5f5', textColor: '#999', border: '1px solid #ddd' };
    
    const hasAm = !!r.am_s1 || r.am_absent;
    const hasPm = !!r.pm_s1 || r.pm_absent;
    const hasLife = !!r.life_s1;

    if (hasAm && hasPm && hasLife) return { label: '✓ 完了', color: '#E8F5E9', textColor: '#2E7D32', border: '1px solid #4CAF50' };
    if (hasAm || hasPm || hasLife) return { label: '入力中', color: '#FFF8E1', textColor: '#F57F17', border: '1px solid #FFC107' };
    return { label: '未入力', color: '#fff', textColor: '#333', border: '1px solid #ddd' };
  };

  return (
    <main style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>日々入力</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => changeDate(-1)}
          style={{ padding: '8px 12px', fontSize: '16px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}>◀</button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, padding: '8px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc' }} />
        <button onClick={() => changeDate(1)}
          style={{ padding: '8px 12px', fontSize: '16px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}>▶</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {members.map(m => {
          const status = getStatus(m.id);
          return (
            <button key={m.id}
              onClick={() => router.push(`/input/${m.id}?date=${date}`)}
              style={{ padding: '12px 16px', fontSize: '15px', textAlign: 'left', backgroundColor: status.color,
                border: status.border, borderRadius: '8px', cursor: 'pointer', color: status.textColor }}>
              <div>{m.name}</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>{status.label}</div>
            </button>
          );
        })}
      </div>
    </main>
  );
}