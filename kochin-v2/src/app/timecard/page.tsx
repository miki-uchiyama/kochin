'use client';

import { useEffect, useState } from 'react';

type Member = { id: number; name: string };
type PunchType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
type ResultType = {
  type: PunchType;
  name: string;
} | null;

// 日本語の自然な声を選んで読み上げる
function speakJapanese(text: string) {
  // 日本語の音声だけに絞ってから探す（他の言語の声を誤って選ばないように）
  const jaVoices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ja'));
  // より自然な「Online (Natural)」音声（七海）を最優先で探す
  const preferredNames = ['七海', 'Online (Natural)', 'Nanami', 'Haruka', 'Ayumi', 'Google 日本語'];

  let voice: SpeechSynthesisVoice | undefined;
  for (const name of preferredNames) {
    voice = jaVoices.find((v) => v.name.includes(name));
    if (voice) break;
  }
  if (!voice) {
    voice = jaVoices[0];
  }

  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'ja-JP';
  if (voice) msg.voice = voice;
  msg.pitch = 1.1;
  msg.rate = 0.95;
  window.speechSynthesis.speak(msg);
}

const messages: Record<PunchType, { label: string; voice: string; icon: string }> = {
  clock_in: { label: '✅ おはようございます', voice: 'おはようございます', icon: '/clock-in.png' },
  clock_out: { label: '👋 おつかれさまでした', voice: 'おつかれさまでした', icon: '/clock-out.png' },
  break_start: { label: '💤 ゆっくり休んでください', voice: 'ゆっくり休んでください', icon: '/break-start.png' },
  break_end: { label: '🌟 おかえりなさい', voice: 'おかえりなさい', icon: '/break-end.png' },
};

const endpoints: Record<PunchType, string> = {
  clock_in: '/api/timecard/manual',
  clock_out: '/api/timecard/manual',
  break_start: '/api/timecard/break-start',
  break_end: '/api/timecard/break-end',
};

export default function TimecardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [result, setResult] = useState<ResultType>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/timecard/register')
      .then((res) => res.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []));

    // 音声リストを事前に読み込んでおく（初回は空のことがあるため）
    window.speechSynthesis.getVoices();
  }, []);

  const handlePunch = async (type: PunchType) => {
    if (!selected || saving) return;
    setSaving(true);

    const body: { member_id: number; type?: string } = { member_id: selected.id };
    if (type === 'clock_in' || type === 'clock_out') {
      body.type = type;
    }

    const res = await fetch(endpoints[type], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'エラーが発生しました');
      setSelected(null);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setResult({ type, name: selected.name });
    setSelected(null);

    speakJapanese(messages[type].voice);

    setTimeout(() => setResult(null), 3000);
  };

  // 完了メッセージ画面
  if (result) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: 'white',
      }}>
        <p style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '24px' }}>
          {result.name} さん
        </p>
        <p style={{ fontSize: '32px', color: '#4CAF50' }}>
          {messages[result.type].label}
        </p>
      </div>
    );
  }

  // エラー画面
  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#000', color: '#ff6b6b',
      }}>
        <p style={{ fontSize: '32px' }}>⚠️ {error}</p>
      </div>
    );
  }

  // 出勤・退勤・休憩選択画面
  if (selected) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', padding: '24px',
        position: 'relative',
      }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            padding: '12px 20px', fontSize: '18px', borderRadius: '8px',
            border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer',
          }}
        >
          ◀ もどる
        </button>

        <p style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '40px' }}>
          {selected.name} さん
        </p>

        <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
          <button
            onClick={() => handlePunch('clock_in')}
            disabled={saving}
            style={{
              width: '220px', height: '220px', border: 'none', borderRadius: '24px',
              backgroundImage: 'url(/clock-in.png)', backgroundSize: 'cover',
              backgroundPosition: 'center', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
          <button
            onClick={() => handlePunch('clock_out')}
            disabled={saving}
            style={{
              width: '220px', height: '220px', border: 'none', borderRadius: '24px',
              backgroundImage: 'url(/clock-out.png)', backgroundSize: 'cover',
              backgroundPosition: 'center', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <button
            onClick={() => handlePunch('break_start')}
            disabled={saving}
            style={{
              width: '160px', height: '160px', border: 'none', borderRadius: '24px',
              backgroundImage: 'url(/break-start.png)', backgroundSize: 'cover',
              backgroundPosition: 'center', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
          <button
            onClick={() => handlePunch('break_end')}
            disabled={saving}
            style={{
              width: '160px', height: '160px', border: 'none', borderRadius: '24px',
              backgroundImage: 'url(/break-end.png)', backgroundSize: 'cover',
              backgroundPosition: 'center', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </div>
    );
  }

  // 名前選択画面
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '24px' }}>
      <p style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px', color: '#e07b00' }}>
        ぎゅっと。出退勤
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '16px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            style={{
              aspectRatio: '1', border: '2px solid #e07b00', borderRadius: '20px',
              backgroundColor: 'white', color: '#333', fontSize: '18px', fontWeight: 'bold',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px', textAlign: 'center',
            }}
          >
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}
