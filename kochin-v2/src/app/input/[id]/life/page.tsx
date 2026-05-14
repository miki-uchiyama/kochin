'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

const SCORE_LABELS = ['挨拶', '返事', '言葉遣い', 'ルール遵守'];
const SCORE_DESCRIPTIONS = [
  ['できない', '自分からはできない', '自分からできるが声が小さい', '自分から挨拶できる', '元気よく自分から挨拶できる'],
  ['できない', '促されるとできる', '返事はするが声が小さい', 'きちんと返事ができる', '明るくはきはきと返事ができる'],
  ['改善しない', '注意され改善するが繰り返す', '注意され改善する', '正しい言葉遣い', '常に丁寧な言葉遣いができる'],
  ['注意を拒否した', '注意をされると改善するが繰り返す', '注意をされ改善した', 'きちんと守れた', '率先してルールを守れた'],
];

export default function InputLifePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const memberId = params.id;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [memberName, setMemberName] = useState('');
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/members').then(r => r.json()).then((members: {id: number, name: string}[]) => {
      const m = members.find(m => m.id === Number(memberId));
      if (m) setMemberName(m.name);
    });
  }, [memberId]);
  
  useEffect(() => {
    fetch(`/api/records?date=${date}`)
      .then(r => r.json())
      .then(records => {
        const found = records.find((r: any) => Number(r.member_id) === Number(memberId));
        if (found) {
          if (found.life_s1) setScores([found.life_s1, found.life_s2, found.life_s3, found.life_s4]);
        }
      });
  }, [memberId, date]);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId, date, period: 'life', scores,
      }),
    });
    setSaving(false);
    router.push(`/input/${memberId}?date=${date}`);
  };

  const dateStr = new Date(date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const canSave = !scores.includes(0);

  return (
    <main style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <button onClick={() => router.push(`/input/${memberId}?date=${date}`)}
          style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}>
          ◀ 戻る
        </button>
        <h1 style={{ fontSize: '20px', margin: 0 }}>{memberName} - 生活態度</h1>
      </div>

      <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>{dateStr}</p>

      {SCORE_LABELS.map((label, i) => (
        <div key={i} style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '16px', marginBottom: '4px', fontWeight: 'bold' }}>{label}</label>
          {scores[i] > 0 && (
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{scores[i]}:{SCORE_DESCRIPTIONS[i][scores[i]-1]}</p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => {
                const s = [...scores]; s[i] = n; setScores(s);
              }}
                style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '50%', border: '2px solid #e07b00',
                  backgroundColor: scores[i] === n ? '#e07b00' : 'white', color: scores[i] === n ? 'white' : '#e07b00',
                  cursor: 'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSave} disabled={saving || !canSave}
        style={{ width: '100%', padding: '16px', fontSize: '18px',
          backgroundColor: !canSave ? '#ccc' : '#9C27B0',
          color: 'white', border: 'none', borderRadius: '8px',
          cursor: !canSave ? 'not-allowed' : 'pointer' }}>
        {saving ? '保存中...' : !canSave ? '全項目を入力してください' : '保存する'}
      </button>
    </main>
  );
}