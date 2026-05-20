'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function InputMemberPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const memberId = params.id;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [memberName, setMemberName] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasAm, setHasAm] = useState(false);
  const [hasPm, setHasPm] = useState(false);
  const [hasLife, setHasLife] = useState(false);
  const [isAbsent, setIsAbsent] = useState(false);

  useEffect(() => {
    fetch('/api/members').then(r => r.json()).then((members: {id: number, name: string}[]) => {
      const m = members.find(m => m.id === Number(memberId));
      if (m) setMemberName(m.name);
    });
    fetch(`/api/records?date=${date}`)
      .then(r => r.json())
      .then(records => {
        const found = records.find((r: {member_id: number, absent: boolean, am_absent: boolean, pm_absent: boolean, am_s1: number, pm_s1: number, life_s1: number}) => 
          Number(r.member_id) === Number(memberId));
        if (found) {
          setIsAbsent(found.absent);
          setHasAm(!!found.am_s1 || found.am_absent);
          setHasPm(!!found.pm_s1 || found.pm_absent);
          setHasLife(!!found.life_s1);
        }
      });
  }, [memberId, date]);

  const handleAbsent = async () => {
    setSaving(true);
    await fetch('/api/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, date, absent: true }),
    });
    setSaving(false);
    router.push('/input');
  };

  const handleCancelAbsent = async () => {
    setSaving(true);
    await fetch('/api/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, date, absent: false }),
    });
    setSaving(false);
    setIsAbsent(false);
  };

  const dateStr = new Date(date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  const btnStyle = (done: boolean, color: string) => ({
    padding: '16px', fontSize: '16px', backgroundColor: done ? '#aaa' : color,
    color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center' as const,
  });

  return (
    <main style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <button onClick={() => router.push('/input')}
          style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}>
          ◀ 戻る
        </button>
        <h1 style={{ fontSize: '20px', margin: 0 }}>{memberName}</h1>
      </div>

      <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>{dateStr}</p>

      {isAbsent ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center', fontSize: '18px', color: '#666' }}>
      全日欠席済み
    </div>
    <button onClick={handleCancelAbsent} disabled={saving}
      style={{ padding: '16px', fontSize: '16px', backgroundColor: '#e07b00',
        color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
      {saving ? '処理中...' : '欠席を取り消す'}
    </button>
  </div>
) : (        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => router.push(`/input/${memberId}/am?date=${date}`)}
            style={btnStyle(hasAm, '#4CAF50')}>
            <span>午前の入力</span>
            {hasAm && <span style={{ fontSize: '14px' }}>✓ 入力済み</span>}
          </button>
          <button onClick={() => router.push(`/input/${memberId}/pm?date=${date}`)}
            style={btnStyle(hasPm, '#2196F3')}>
            <span>午後の入力</span>
            {hasPm && <span style={{ fontSize: '14px' }}>✓ 入力済み</span>}
          </button>
          <button onClick={() => router.push(`/input/${memberId}/life?date=${date}`)}
            style={btnStyle(hasLife, '#9C27B0')}>
            <span>生活態度の入力</span>
            {hasLife && <span style={{ fontSize: '14px' }}>✓ 入力済み</span>}
          </button>
          <button onClick={handleAbsent} disabled={saving}
            style={{ padding: '16px', fontSize: '16px', backgroundColor: '#ccc',
              color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            {saving ? '保存中...' : '全日欠席'}
          </button>
        </div>
      )}
    </main>
  );
}