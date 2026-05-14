'use client';

import { useState, useEffect } from 'react';

type Member = { id: number; name: string; active: boolean };
type Group = { id: number; name: string; coefficient: number; active: boolean };

export default function SettingsPage() {
  const [tab, setTab] = useState<'members' | 'pay' | 'groups'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [newMemberName, setNewMemberName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/members-all').then(r => r.json()).then(setMembers);
    fetch('/api/groups').then(r => r.json()).then(setGroups);
    fetch('/api/settings').then(r => r.json()).then(setSettings);
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName }),
    });
    if (res.ok) {
      fetch('/api/members').then(r => r.json()).then(setMembers);
      setNewMemberName('');
      showMessage('利用者を追加しました');
    }
  };

  const handleToggleMember = async (id: number, active: boolean) => {
    await fetch('/api/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    fetch('/api/members-all').then(r => r.json()).then(setMembers);
  };

  const handleSaveSettings = async () => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    showMessage('保存しました');
  };

  return (
    <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>設定</h1>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['members', 'pay', 'groups'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 16px', fontSize: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: tab === t ? '#e07b00' : '#ddd', color: tab === t ? 'white' : 'black' }}>
            {t === 'members' ? '利用者' : t === 'pay' ? '基本給・手当' : 'グループ'}
          </button>
        ))}
      </div>

      {/* 利用者タブ */}
      {tab === 'members' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
              placeholder="新しい利用者名"
              style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }} />
            <button onClick={handleAddMember}
              style={{ padding: '10px 16px', fontSize: '16px', backgroundColor: '#e07b00', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              追加
            </button>
          </div>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px', borderBottom: '1px solid #eee' }}>
              <span style={{ fontSize: '16px', color: m.active ? '#333' : '#999' }}>{m.name}</span>
              <button onClick={() => handleToggleMember(m.id, m.active)}
                style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  backgroundColor: m.active ? '#f44336' : '#4CAF50', color: 'white' }}>
                {m.active ? '無効にする' : '有効にする'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 基本給・手当タブ */}
      {tab === 'pay' && (
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>基本給（日額）</h2>
          {[['base_pay_0_2', '欠席0〜2日'], ['base_pay_3_5', '欠席3〜5日'], ['base_pay_6', '欠席6日以上']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <label style={{ width: '120px', fontSize: '16px' }}>{label}</label>
              <input type="number" value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })}
                style={{ width: '100px', padding: '8px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <span>円/日</span>
            </div>
          ))}

          <h2 style={{ fontSize: '18px', marginBottom: '12px', marginTop: '20px' }}>精勤手当（月額）</h2>
          {[['attendance_bonus_0_2', '欠席0〜2日'], ['attendance_bonus_3_5', '欠席3〜5日'], ['attendance_bonus_6', '欠席6日以上']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <label style={{ width: '120px', fontSize: '16px' }}>{label}</label>
              <input type="number" value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })}
                style={{ width: '100px', padding: '8px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <span>円/月</span>
            </div>
          ))}

          <h2 style={{ fontSize: '18px', marginBottom: '12px', marginTop: '20px' }}>能力給単価</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <label style={{ width: '120px', fontSize: '16px' }}>1ポイントあたり</label>
            <input type="number" value={settings['unit_price'] || ''} onChange={e => setSettings({ ...settings, unit_price: Number(e.target.value) })}
              style={{ width: '100px', padding: '8px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }} />
            <span>円</span>
          </div>

          <button onClick={handleSaveSettings}
            style={{ width: '100%', padding: '16px', fontSize: '18px', backgroundColor: '#e07b00',
              color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }}>
            保存する
          </button>
        </div>
      )}

      {/* グループタブ */}
      {tab === 'groups' && (
        <div>
          {groups.map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px', borderBottom: '1px solid #eee' }}>
              <span style={{ width: '60px', fontSize: '16px', fontWeight: 'bold', color: '#e07b00' }}>{g.coefficient}</span>
              <span style={{ flex: 1, fontSize: '15px' }}>{g.name}</span>
            </div>
          ))}
        </div>
      )}

      {message && <p style={{ marginTop: '16px', fontSize: '16px', color: 'green', textAlign: 'center' }}>{message}</p>}
    </main>
  );
}