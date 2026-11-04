'use client';

import { useEffect, useState } from 'react';

type Member = { id: number; name: string; active: boolean | null };
type Break = { break_start: string | null; break_end: string | null };
type Record = { date: string; clock_in: string | null; clock_out: string | null; breaks: Break[] };

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 欠席・公休の色分け（予定外欠席＝オレンジ、予定欠席＝紫、公休＝青）
const ABSENCE_COLORS: { [type: string]: { color: string; bg: string } } = {
  予定外欠席: { color: '#a05a00', bg: '#fff4e0' },
  予定欠席: { color: '#6a3fa0', bg: '#f1e8fb' },
};
const DAY_OFF_COLOR = { color: '#1d5fa8', bg: '#e3f0fd' };

function formatTime(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
}

// データベースから返る日付を "YYYY-MM-DD" に揃える（時刻が付いてくる場合があるため）
function toDateKey(value: string) {
  return value.slice(0, 10);
}

function getDaysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

export default function MonthlyTimecardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [records, setRecords] = useState<Record[]>([]);
  const [absences, setAbsences] = useState<{ [date: string]: { type: string; reason: string } }>({});
  const [dayOffs, setDayOffs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  // 表示の切り替え：スマホ（狭い画面）は列、PC（広い画面）はカレンダーを最初に出す
  const [view, setView] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem('timecard-monthly-view');
    } catch {}
    if (saved === 'list' || saved === 'calendar') {
      setView(saved);
    } else {
      setView(window.innerWidth >= 768 ? 'calendar' : 'list');
    }
  }, []);

  const changeView = (v: 'list' | 'calendar') => {
    setView(v);
    try {
      window.localStorage.setItem('timecard-monthly-view', v);
    } catch {}
  };

  useEffect(() => {
    fetch('/api/timecard/monthly')
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []));
  }, []);

  useEffect(() => {
    if (!memberId || !month) return;
    setLoading(true);
    fetch(`/api/timecard/monthly?member_id=${memberId}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(data.records || []);
        setAbsences(data.absences || {});
        setDayOffs(data.dayOffs || []);
      })
      .finally(() => setLoading(false));
  }, [memberId, month]);

  const recordMap = new Map(records.map((r) => [toDateKey(r.date), r]));
  const days = month ? getDaysInMonth(month) : [];
  const visibleMembers = showInactive ? members : members.filter((m) => m.active !== false);
  const attendedCount = records.filter((r) => r.clock_in).length;

  return (
    <div style={{ maxWidth: view === 'calendar' ? '1000px' : '500px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
        月別タイムカード
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxWidth: '500px' }}>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '12px', fontSize: '18px' }}
        >
          <option value="">利用者を選択してください</option>
          {visibleMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.active === false ? '（退所）' : ''}</option>
          ))}
        </select>

        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '12px', fontSize: '18px' }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          {([['list', '列表示'], ['calendar', 'カレンダー表示']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '15px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: '1px solid #e07b00',
                backgroundColor: view === v ? '#e07b00' : 'white',
                color: view === v ? 'white' : '#e07b00',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#555' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          退所した利用者も表示する
        </label>
      </div>

      {!memberId && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>
          利用者を選択してください
        </p>
      )}

      {memberId && loading && (
        <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>読み込み中...</p>
      )}

      {memberId && !loading && (
        <>
          <div style={{
            backgroundColor: '#e07b00', color: 'white', borderRadius: '8px',
            padding: '10px 16px', marginBottom: '12px', fontWeight: 'bold', textAlign: 'center'
          }}>
            出勤日数：{attendedCount}日
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', fontSize: '12px' }}>
            {([
              ['予定外欠席', ABSENCE_COLORS['予定外欠席']],
              ['予定欠席', ABSENCE_COLORS['予定欠席']],
              ['公休', DAY_OFF_COLOR],
            ] as const).map(([label, c]) => (
              <span key={label} style={{ color: c.color, backgroundColor: c.bg, borderRadius: '4px', padding: '2px 8px' }}>
                {label}
              </span>
            ))}
          </div>

          {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {days.map((date) => {
              const r = recordMap.get(date);
              const d = new Date(date);
              const weekday = WEEKDAYS[d.getDay()];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const clockIn = r ? formatTime(r.clock_in) : null;
              const clockOut = r ? formatTime(r.clock_out) : null;
              const breaks = r?.breaks || [];
              const absence = absences[date];
              const isDayOff = dayOffs.includes(date);

              return (
                <div
                  key={date}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    gap: '8px',
                  }}
                >
                  <div style={{
                    fontWeight: 'bold',
                    color: isWeekend ? '#e07b00' : '#333',
                    minWidth: '70px',
                  }}>
                    {Number(date.split('-')[2])}日({weekday})
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', color: clockIn ? '#333' : '#bbb' }}>
                      {clockIn ? `出勤 ${clockIn}` : '未打刻'}
                      {clockOut ? `　退勤 ${clockOut}` : ''}
                    </div>
                    {absence !== undefined && (
                      <div style={{ fontSize: '12px', color: ABSENCE_COLORS[absence.type]?.color, marginTop: '2px' }}>
                        {absence.type === '予定外欠席' ? `${absence.type}：${absence.reason || '（理由未入力）'}` : absence.type}
                      </div>
                    )}
                    {isDayOff && (
                      <div style={{ fontSize: '12px', color: DAY_OFF_COLOR.color, marginTop: '2px' }}>公休</div>
                    )}
                    {clockIn && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                        休憩{' '}
                        {breaks.length > 0
                          ? breaks
                              .map(
                                (b) =>
                                  `${formatTime(b.break_start)}〜${b.break_end ? formatTime(b.break_end) : '休憩中'}`
                              )
                              .join('、')
                          : '0分'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {view === 'calendar' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    padding: '6px 0',
                    color: i === 0 || i === 6 ? '#e07b00' : '#ccc',
                  }}
                >
                  {w}
                </div>
              ))}
              {Array.from({ length: new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1, 1).getDay() }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {days.map((date) => {
                const r = recordMap.get(date);
                const dow = new Date(date).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const clockIn = r ? formatTime(r.clock_in) : null;
                const clockOut = r ? formatTime(r.clock_out) : null;
                const absence = absences[date];
                const isDayOff = dayOffs.includes(date);
                return (
                  <div
                    key={date}
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #eee',
                      borderRadius: '6px',
                      padding: '6px',
                      minHeight: '84px',
                      fontSize: '12px',
                      color: '#333',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: isWeekend ? '#e07b00' : '#333', marginBottom: '2px' }}>
                      {Number(date.split('-')[2])}
                    </div>
                    {clockIn && (
                      <div>
                        <div>出 {clockIn}</div>
                        <div style={{ color: clockOut ? '#333' : '#e07b00' }}>退 {clockOut ?? '未打刻'}</div>
                      </div>
                    )}
                    {absence !== undefined && (
                      <div
                        style={{
                          color: ABSENCE_COLORS[absence.type]?.color,
                          backgroundColor: ABSENCE_COLORS[absence.type]?.bg,
                          borderRadius: '4px',
                          padding: '2px 4px',
                          marginTop: '2px',
                        }}
                      >
                        {absence.type === '予定外欠席' ? `${absence.type}：${absence.reason || '理由未入力'}` : absence.type}
                      </div>
                    )}
                    {isDayOff && (
                      <div
                        style={{
                          color: DAY_OFF_COLOR.color,
                          backgroundColor: DAY_OFF_COLOR.bg,
                          borderRadius: '4px',
                          padding: '2px 4px',
                          marginTop: '2px',
                        }}
                      >
                        公休
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
