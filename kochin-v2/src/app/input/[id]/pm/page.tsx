'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

type Group = { id: number; name: string; coefficient: number };

const SCORE_LABELS = ['集中力', '正確さ', 'スピード', '指示理解', '協調性'];
const SCORE_DESCRIPTIONS = [
  ['作業に向かう時間が短く、注意が散りやすい。声かけしても戻りにくい。', '作業に向かうが、短時間で集中が途切れる。声かけで戻るが継続しにくい。', '一定時間は集中して作業できる。時々途切れるが声かけで戻れる。', '長時間安定して集中できる。声かけがほぼ不要。', '作業中の集中が非常に安定しており、環境の変化にも左右されない。'],
  ['ミスが多く、修正が必要。手順を理解していない。', 'ミスはあるが、指示すれば修正できる。', '基本的に正確に作業できる。ミスは少ない。', '高い正確性で作業でき、ほとんどミスがない。', '常に非常に正確で、他者のミスにも気づけるレベル。'],
  ['作業が極端に遅く、完了しないことが多い。', 'ゆっくりだが、時間をかければ完了できる。', '一般的なペースで作業できる。', '平均より速く、安定したペースで作業できる。', '非常に速く、かつ品質も維持できる。'],
  ['指示を理解できず、繰り返し説明が必要。', '繰り返しの説明で理解できる。', '一度の説明で概ね理解し、作業できる。', '指示の意図まで理解し、応用できる。', '指示を即座に理解し、先回りして行動できる。'],
  ['他者との関わりが難しく、トラブルが起きやすい。', '最低限の協力はできるが、消極的。', '周囲と問題なく作業できる。', '積極的に協力し、雰囲気を乱さない。', '他者をサポートし、チーム全体に良い影響を与える。'],
];
const HOURS = [0.5, 1.0, 1.5, 2.0];

export default function InputPmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const memberId = params.id;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [memberName, setMemberName] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<number>(0);
  const [hours, setHours] = useState<number>(2.0);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [pmAbsent, setPmAbsent] = useState(false);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/members').then(r => r.json()).then((members: {id: number, name: string}[]) => {
      const m = members.find(m => m.id === Number(memberId));
      if (m) setMemberName(m.name);
    });
    fetch('/api/groups').then(r => r.json()).then((g: Group[]) => {
      setGroups(g);
      if (g.length > 0) setGroupId(g[0].id);
    });
  }, [memberId]);
  
  useEffect(() => {
    fetch(`/api/records?date=${date}`)
      .then(r => r.json())
      .then(records => {
        const found = records.find((r: any) => Number(r.member_id) === Number(memberId));
        if (found) {
          setPmAbsent(found.pm_absent);
          if (found.pm_group_id) setGroupId(found.pm_group_id);
          if (found.pm_hours) setHours(Number(found.pm_hours));
          if (found.pm_s1) setScores([found.pm_s1, found.pm_s2, found.pm_s3, found.pm_s4, found.pm_s5]);
          if (found.pm_memo) setMemo(found.pm_memo);
        }
      });
  }, [memberId, date]);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId, date, period: 'pm',
        pm_absent: pmAbsent,
        group_id: pmAbsent ? null : groupId,
        hours: pmAbsent ? null : hours,
        scores: pmAbsent ? null : scores,
        memo: pmAbsent ? null : memo,
      }),
    });
    setSaving(false);
    router.push(`/input/${memberId}?date=${date}`);
  };

  const dateStr = new Date(date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const canSave = pmAbsent || !scores.includes(0);

  return (
    <main style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <button onClick={() => router.push(`/input/${memberId}?date=${date}`)}
          style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}>
          ◀ 戻る
        </button>
        <h1 style={{ fontSize: '20px', margin: 0 }}>{memberName} - 午後</h1>
      </div>

      <p style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>{dateStr}</p>

      <button onClick={() => setPmAbsent(!pmAbsent)}
        style={{ width: '100%', padding: '14px', fontSize: '16px', marginBottom: '20px',
          backgroundColor: pmAbsent ? '#e07b00' : '#f5f5f5',
          color: pmAbsent ? 'white' : '#333',
          border: '2px solid #e07b00', borderRadius: '8px', cursor: 'pointer' }}>
        {pmAbsent ? '✓ 午後休み（選択中）' : '午後休み'}
      </button>

      {!pmAbsent && <>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold' }}>作業グループ</label>
          <select value={groupId} onChange={e => setGroupId(Number(e.target.value))}
            style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}>
            {groups.map(g => <option key={g.id} value={g.id}>G{g.id} ({g.coefficient}) {g.name}</option>)}
          </select>
        </div>

        {/* 作業内容メモ */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold' }}>作業内容</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="作業内容を入力してください"
            style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc',
              minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold' }}>作業時間</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {HOURS.map(h => (
              <button key={h} onClick={() => setHours(h)}
                style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '8px', border: '2px solid #e07b00',
                  backgroundColor: hours === h ? '#e07b00' : 'white', color: hours === h ? 'white' : '#e07b00',
                  cursor: 'pointer' }}>
                {h}h
              </button>
            ))}
          </div>
        </div>

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
      </>}

      <button onClick={handleSave} disabled={saving || !canSave}
        style={{ width: '100%', padding: '16px', fontSize: '18px',
          backgroundColor: !canSave ? '#ccc' : '#e07b00',
          color: 'white', border: 'none', borderRadius: '8px',
          cursor: !canSave ? 'not-allowed' : 'pointer' }}>
        {saving ? '保存中...' : !canSave ? '全項目を入力してください' : '保存する'}
      </button>
    </main>
  );
}