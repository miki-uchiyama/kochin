'use client';

import { useEffect, useState } from 'react';

type Break = {
  break_start: string | null;
  break_end: string | null;
};

type Record = {
  member_id: number;
  name: string;
  timecard_id: number | null;
  clock_in: string | null;
  clock_out: string | null;
  breaks: Break[];
  day_off?: boolean;
  absence_type?: string | null;
  absence_reason?: string | null;
  absence_note?: string | null;
};

// 日付（YYYY-MM-DD）を、指定した日数だけ前後に動かす
function shiftDate(value: string, days: number) {
  if (!value) return value;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function formatTime(value: string | null) {
  if (!value) return '未打刻';
  const d = new Date(value);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
}

function toInputTime(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  // 編集欄に入れる時刻は、どの端末で見ても必ず日本時間になるようにする
  const parts = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h.padStart(2, '0')}:${m}`;
}

export default function TimecardListPage() {
  const [date, setDate] = useState(() => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [editBreaks, setEditBreaks] = useState<{ start: string; end: string }[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
    setEditBreaks((r.breaks || []).map((b) => ({ start: toInputTime(b.break_start), end: toInputTime(b.break_end) })));
    setSaveError('');
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
    if (!res.ok) {
      setSaving(false);
      setSaveError('出勤・退勤の保存に失敗しました');
      return;
    }

    // 休憩は、入力の空欄（開始が空の行）を除いて、まるごと入れ替えて保存する
    const breaksRes = await fetch('/api/timecard/breaks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id,
        date,
        breaks: editBreaks
          .filter((b) => b.start)
          .map((b) => ({ start: b.start, end: b.end || null })),
      }),
    });
    setSaving(false);
    if (breaksRes.ok) {
      setEditingId(null);
      load();
    } else {
      const data = await breaksRes.json().catch(() => ({}));
      setSaveError(data.error || '休憩の保存に失敗しました');
    }
  };

  const handleDelete = async (r: Record) => {
    const ok = window.confirm(`${r.name} さんの ${date} の打刻記録を削除しますか？`);
    if (!ok) return;

    setDeletingId(r.member_id);
    const res = await fetch('/api/timecard/update', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: r.member_id, date }),
    });
    setDeletingId(null);
    if (res.ok) {
      load();
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
        タイムカード一覧
      </h1>

      <div style={{ marginBottom: '16px', maxWidth: '420px', display: 'flex', gap: '8px' }}>
        <button onClick={() => setDate(shiftDate(date, -1))} aria-label="前の日" style={{ padding: '0 16px', fontSize: '20px', fontWeight: 'bold', color: '#e07b00', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}>
          ◀
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '18px',
            flex: 1,
            minWidth: 0,
          }}
        />
        <button onClick={() => setDate(shiftDate(date, 1))} aria-label="次の日" style={{ padding: '0 16px', fontSize: '20px', fontWeight: 'bold', color: '#e07b00', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}>
          ▶
        </button>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>読み込み中...</p>
      )}

      {!loading && records.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>利用者が登録されていません</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '10px',
        }}
      >
        {records.map((r) => {
          const isEditing = editingId === r.member_id;
          const hasRecord = Boolean(r.clock_in || r.clock_out);
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

                  <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
                    <span style={{ color: '#888', marginRight: '6px' }}>休憩</span>
                    {r.breaks && r.breaks.length > 0 ? (
                      r.breaks.map((b, i) => (
                        <span key={i} style={{ marginRight: '12px' }}>
                          {formatTime(b.break_start)}〜{b.break_end ? formatTime(b.break_end) : '休憩中'}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#bbb' }}>0分</span>
                    )}
                  </div>
                  {r.absence_type === '予定外欠席' && (
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#7a4a00',
                        backgroundColor: '#fff4e0',
                        border: '1px solid #f0c987',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>予定外欠席</div>
                      <div>
                        <span style={{ color: '#a07030', marginRight: '6px' }}>理由</span>
                        {r.absence_reason || '（未入力）'}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        <span style={{ color: '#a07030', marginRight: '6px' }}>確認内容</span>
                        {r.absence_note || '（未入力）'}
                      </div>
                    </div>
                  )}
                  {r.absence_type === '予定欠席' && (
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#6a3fa0',
                        backgroundColor: '#f1e8fb',
                        border: '1px solid #d6c2ee',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        marginBottom: '10px',
                      }}
                    >
                      予定欠席
                    </div>
                  )}
                  {r.day_off && (
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#1d5fa8',
                        backgroundColor: '#e3f0fd',
                        border: '1px solid #b9d6f5',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        marginBottom: '10px',
                      }}
                    >
                      公休
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
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
                    {hasRecord && (
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.member_id}
                        style={{
                          fontSize: '14px',
                          color: '#f44336',
                          border: '1px solid #f44336',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          backgroundColor: 'white',
                        }}
                      >
                        {deletingId === r.member_id ? '削除中...' : '削除'}
                      </button>
                    )}
                  </div>
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
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '13px', color: '#888', display: 'block', marginBottom: '4px' }}>
                      休憩（終了を空にすると「休憩中」になります）
                    </label>
                    {editBreaks.length === 0 && (
                      <div style={{ fontSize: '14px', color: '#bbb', marginBottom: '6px' }}>休憩なし</div>
                    )}
                    {editBreaks.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <input
                          type="time"
                          value={b.start}
                          onChange={(e) =>
                            setEditBreaks(editBreaks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
                          }
                          style={{ flex: 1, minWidth: 0, padding: '8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '16px' }}
                        />
                        <span>〜</span>
                        <input
                          type="time"
                          value={b.end}
                          onChange={(e) =>
                            setEditBreaks(editBreaks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                          }
                          style={{ flex: 1, minWidth: 0, padding: '8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '16px' }}
                        />
                        <button
                          onClick={() => setEditBreaks(editBreaks.filter((_, j) => j !== i))}
                          aria-label="この休憩を削除"
                          style={{ padding: '6px 10px', color: '#f44336', border: '1px solid #f44336', borderRadius: '6px', backgroundColor: 'white' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditBreaks([...editBreaks, { start: '', end: '' }])}
                      style={{ fontSize: '14px', color: '#2196F3', border: '1px solid #2196F3', borderRadius: '6px', padding: '6px 14px', backgroundColor: 'white' }}
                    >
                      ＋ 休憩を追加
                    </button>
                  </div>
                  {saveError && (
                    <div style={{ fontSize: '14px', color: '#f44336', marginBottom: '8px' }}>{saveError}</div>
                  )}
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
