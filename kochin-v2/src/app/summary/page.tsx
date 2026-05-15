'use client';

import { useState, useEffect } from 'react';

type Summary = {
  member_id: number;
  name: string;
  work_days: number;
  absent_days: number;
  ability_pay: number;
  base_pay: number;
  attendance_bonus: number;
  input_count: number;
  total: number;
};

type Stats = {
  avgUsers: number;
  avgMonthlyPay: number;
  threeMonthAvgUsers: number;
  threeMonthRate: number;
  alert: 'none' | 'yellow' | 'red';
  elapsedMonths: number;
};

export default function SummaryPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/summary?month=${month}`)
      .then(r => r.json())
      .then(data => {
        setSummaries(data.members);
        setStats(data.stats);
        setLoading(false);
      });
  }, [month]);

  const totalPay = summaries.reduce((a, s) => a + s.total, 0);

  const alertBg = stats?.alert === 'red' ? '#fff5f5' : stats?.alert === 'yellow' ? '#fffff0' : '#fff';
  const alertBorder = stats?.alert === 'red' ? '#e53e3e' : stats?.alert === 'yellow' ? '#d69e2e' : '#e0e0e0';
  const alertColor = stats?.alert === 'red' ? '#e53e3e' : stats?.alert === 'yellow' ? '#d69e2e' : '#333';
  const alertIcon = stats?.alert === 'red' ? '🔴' : stats?.alert === 'yellow' ? '⚠️' : '✅';

  return (
    <main style={{ padding: '16px', maxWidth: '100%' }}>

      {/* 月選択 */}
      <div style={{ marginBottom: '16px' }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '18px', borderRadius: '8px', border: '1px solid #ccc' }} />
      </div>

      {/* 上部サマリー 5列 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        
        {/* 1〜4列目：通常カード */}
        {[
          { label: '対象人数', value: `${summaries.length}人` },
          { label: '工賃総額', value: `${totalPay.toLocaleString()}円` },
          { label: '平均工賃（累積）', value: stats ? `${stats.avgMonthlyPay.toLocaleString()}円` : '-' },
          { label: '平均利用者数（累積）', value: stats ? `${stats.avgUsers}人` : '-' },
        ].map(item => (
          <div key={item.label} style={{
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px',
            padding: '16px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{item.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{item.value}</div>
          </div>
        ))}

        {/* 5列目：3か月平均利用者数（アラート色） */}
        <div style={{
          background: alertBg,
          border: `2px solid ${alertBorder}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            3か月平均利用者数 {alertIcon}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: alertColor }}>
            {stats ? `${stats.threeMonthAvgUsers}人` : '-'}
          </div>
          <div style={{ fontSize: '14px', color: alertColor, marginTop: '4px' }}>
            {stats ? `定員比 ${stats.threeMonthRate}%` : ''}
          </div>
          {stats?.alert === 'red' && (
            <div style={{ fontSize: '12px', color: '#e53e3e', marginTop: '6px' }}>減算対象の可能性</div>
          )}
          {stats?.alert === 'yellow' && (
            <div style={{ fontSize: '12px', color: '#d69e2e', marginTop: '6px' }}>定員に近づいています</div>
          )}
        </div>
      </div>

      {loading && <p>読み込み中...</p>}

      {/* 利用者カード 6列グリッド */}
      {!loading && summaries.length > 0 && (
        <div className="summary-grid">
          {summaries.map(s => (
            <div key={s.member_id} style={{
              background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '16px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{s.name}</div>
                <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
                  出席{s.work_days}日 / 欠席{s.absent_days}日
                </div>
              </div>
              <div style={{ fontSize: '15px', lineHeight: '2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>基本給</span>
                  <span>{s.base_pay.toLocaleString()}円</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>能力給</span>
                  <span>{s.ability_pay.toLocaleString()}円</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>精勤手当</span>
                  <span>{s.attendance_bonus.toLocaleString()}円</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>入力件数</span>
                  <span>{s.input_count ?? '-'}件</span>
                </div>
              </div>
              <div style={{
                marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee',
                textAlign: 'right', fontSize: '20px', fontWeight: 'bold', color: '#c8702a'
              }}>
                {s.total.toLocaleString()}円
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && summaries.length === 0 && (
        <p style={{ color: '#999' }}>データがありません</p>
      )}
    </main>
  );
}