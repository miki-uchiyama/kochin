'use client';

import { useEffect, useState } from 'react';

type Record = {
  member_id: number;
  name: string;
  timecard_id: number | null;
  clock_in: string | null;
  clock_out: string | null;
};

function formatTime(value: string | null) {
  if (!value) return '未打刻';
  const d = new Date(value);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function toInputTime(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function TimecardListPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/timecard/list?date=${date}`)
      .then((res) => res.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    setEditingId(null);
  }, [date]);

  const startEdit = (r: Record) => {
    setEditingId(r.member_id);
    setEditIn(toInputTime(r.clock_in));
    setEditOut(toInputTime(r.clock_out));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (member_id: number) => {
    setSaving(true);
    const res = await fetch('/api/timecard/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id,
        date,
        clock_in: editIn || null,
        clock_out: editOut || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditingId(null);
      load();
    }
  };

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
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>利用者が登録されていません</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {records.map((r) => {
          const isEditing = editingId === r.member_id;
          return (
            <div
              key={r.member_id}
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

              {!isEditing && (
                <>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '16px', marginBottom: '10px' }}>
                    <div>
                      <span style={{ color: '#888', marginRight: '6px' }}>出勤</span>
                      <span style={{ fontWeight: 'bold', color: r.clock_in ? '#000' : '#bbb' }}>
                        {formatTime(r.clock_in)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#888', marginRight: '6px' }}>退勤</span>
                      <span
                        style={{
                          fontWeight: 'bold',
                          color: r.clock_out ? '#000' : r.clock_in ? '#e07b00' : '#bbb',
                        }}
                      >
                        {formatTime(r.clock_out)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(r)}
                    style={{
                      fontSize: '14px',
                      color: '#2196F3',
                      border: '1px solid #2196F3',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      backgroundColor: 'white',
                    }}
                  >
                    修正
                  </button>
                </>
              )}

              {isEditing && (
                <div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#888', display: 'block', marginBottom: '4px' }}>
                        出勤
                      </label>
                      <input
                        type="time"
                        value={editIn}
                        onChange={(e) => setEditIn(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '16px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#888', display: 'block', marginBottom: '4px' }}>
                        退勤
                      </label>
                      <input
                        type="time"
                        value={editOut}
                        onChange={(e) => setEditOut(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '16px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => saveEdit(r.member_id)}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#eee',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '15px',
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}