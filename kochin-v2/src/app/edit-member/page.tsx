'use client';

import { useState, useEffect } from 'react';

type Member = { id: number; name: string };
type Record = {
  id: number; date: string; absent: boolean;
  am_absent: boolean; pm_absent: boolean;
  am_group_id: number; am_hours: number;
  pm_group_id: number; pm_hours: number;
  am_s1: number; am_s2: number; am_s3: number; am_s4: number; am_s5: number;
  pm_s1: number; pm_s2: number; pm_s3: number; pm_s4: number; pm_s5: number;
  life_s1: number; life_s2: number; life_s3: number; life_s4: number;
};
type Group = { id: number; name: string; coefficient: number };

const AM_LABELS = ['集中力', '正確さ', 'スピード', '指示理解', '協調性'];
const LIFE_LABELS = ['挨拶', '返事', '言葉遣い', 'ルール遵守'];
const HOURS = [0.5, 1.0, 1.5, 2.0];

export default function EditMemberPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState<Record[]>([]);
  const [tab, setTab] = useState<'am' | 'pm' | 'life'>('am');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/members').then(r => r.json()).then(setMembers);
    fetch('/api/groups').then(r => r.json()).then(setGroups);
  }, []);

  useEffect(() => {
    if (!selectedMember || !selectedMonth) return;
    fetch(`/api/records-member?member_id=${selectedMember}&month=${selectedMonth}`)
      .then(r => r.json()).then(setRecords);
  }, [selectedMember, selectedMonth]);

  const updateRecord = (id: number, field: string, value: number | boolean) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    });
    setSaving(false);
    setMessage(res.ok ? '保存しました！' : '保存に失敗しました');
    setTimeout(() => setMessage(''), 3000);
  };

  const ScoreButtons = ({ recordId, field, value }: { recordId: number; field: string; value: number }) => (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => updateRecord(recordId, field, n)}
          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #e07b00',
            backgroundColor: value === n ? '#e07b00' : 'white', color: value === n ? 'white' : '#e07b00',
            cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
          {n}
        </button>
      ))}
    </div>
  );

  return (
    <main style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>利用者別修正</h1>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>利用者</label>
          <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}>
            <option value="">選択してください</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>年月</label>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }} />
        </div>
      </div>

      {records.length > 0 && <>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['am', 'pm', 'life'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '10px 24px', fontSize: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                backgroundColor: tab === t ? '#e07b00' : '#ddd', color: tab === t ? 'white' : 'black' }}>
              {t === 'am' ? '午前' : t === 'pm' ? '午後' : '生活態度'}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={th}>日付</th>
                {tab === 'am' && <th style={th}>午前</th>}
                {tab === 'pm' && <th style={th}>午後</th>}
                {tab !== 'life' && <><th style={th}>グループ</th><th style={th}>時間</th></>}
                {tab === 'am' && AM_LABELS.map(l => <th key={l} style={th}>{l}</th>)}
                {tab === 'pm' && AM_LABELS.map(l => <th key={l} style={th}>{l}</th>)}
                {tab === 'life' && LIFE_LABELS.map(l => <th key={l} style={th}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{new Date(r.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}</td>
                  {tab === 'am' && (
                    <td style={td}>
                      <button onClick={() => updateRecord(r.id, 'am_absent', !r.am_absent)}
                        style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          backgroundColor: r.am_absent ? '#ccc' : '#4CAF50', color: 'white' }}>
                        {r.am_absent ? '欠席' : '出席'}
                      </button>
                    </td>
                  )}
                  {tab === 'pm' && (
                    <td style={td}>
                      <button onClick={() => updateRecord(r.id, 'pm_absent', !r.pm_absent)}
                        style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          backgroundColor: r.pm_absent ? '#ccc' : '#4CAF50', color: 'white' }}>
                        {r.pm_absent ? '欠席' : '出席'}
                      </button>
                    </td>
                  )}
                  {tab === 'am' && !r.am_absent && <>
                    <td style={td}>
                      <select value={r.am_group_id || ''} onChange={e => updateRecord(r.id, 'am_group_id', Number(e.target.value))}
                        style={{ fontSize: '14px', padding: '4px' }}>
                        {groups.map(g => <option key={g.id} value={g.id}>G{g.id}({g.coefficient})</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <select value={Number(r.am_hours)} onChange={e => updateRecord(r.id, 'am_hours', Number(e.target.value))}
                        style={{ fontSize: '14px', padding: '4px' }}>
                        {HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                      </select>
                    </td>
                    {['am_s1','am_s2','am_s3','am_s4','am_s5'].map(f => (
                      <td key={f} style={td}><ScoreButtons recordId={r.id} field={f} value={r[f as keyof Record] as number} /></td>
                    ))}
                  </>}
                  {tab === 'pm' && !r.pm_absent && <>
                    <td style={td}>
                      <select value={r.pm_group_id || ''} onChange={e => updateRecord(r.id, 'pm_group_id', Number(e.target.value))}
                        style={{ fontSize: '14px', padding: '4px' }}>
                        <option value="">なし</option>
                        {groups.map(g => <option key={g.id} value={g.id}>G{g.id}({g.coefficient})</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <select value={Number(r.pm_hours) || 0} onChange={e => updateRecord(r.id, 'pm_hours', Number(e.target.value))}
                        style={{ fontSize: '14px', padding: '4px' }}>
                        <option value={0}>なし</option>
                        {HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                      </select>
                    </td>
                    {['pm_s1','pm_s2','pm_s3','pm_s4','pm_s5'].map(f => (
                      <td key={f} style={td}><ScoreButtons recordId={r.id} field={f} value={r[f as keyof Record] as number} /></td>
                    ))}
                  </>}
                  {tab === 'life' && (!r.am_absent || !r.pm_absent) && <>
                    {['life_s1','life_s2','life_s3','life_s4'].map(f => (
                      <td key={f} style={td}><ScoreButtons recordId={r.id} field={f} value={r[f as keyof Record] as number} /></td>
                    ))}
                  </>}
                  {tab === 'life' && r.am_absent && r.pm_absent && (
                    <td style={td} colSpan={4}><span style={{ color: '#999' }}>全日欠席</span></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ marginTop: '20px', width: '100%', padding: '16px', fontSize: '18px',
            backgroundColor: '#e07b00', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {saving ? '保存中...' : '保存する'}
        </button>
        {message && <p style={{ marginTop: '12px', fontSize: '18px', color: 'green', textAlign: 'center' }}>{message}</p>}
      </>}
    </main>
  );
}

const th = { padding: '12px 8px', textAlign: 'left' as const, fontSize: '15px', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const td = { padding: '8px', verticalAlign: 'middle' as const };