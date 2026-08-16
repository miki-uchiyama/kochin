'use client';

import { useEffect, useRef, useState } from 'react';

type ResultType = {
  type: 'clock_in' | 'clock_out';
  name: string;
} | null;

export default function TimecardPage() {
  const [result, setResult] = useState<ResultType>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 常にinputにフォーカスを当てる
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    document.addEventListener('click', focus);
    return () => document.removeEventListener('click', focus);
  }, []);

  // カードリードの処理
  const handleInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const card_id = (e.target as HTMLInputElement).value.trim();
    if (!card_id) return;
    (e.target as HTMLInputElement).value = '';

    const res = await fetch('/api/timecard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setResult(null);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setResult(data);
    setError(null);

    // 音声を再生
    const msg = new SpeechSynthesisUtterance(
      data.type === 'clock_in' ? 'おはようございます' : 'おつかれさまでした'
    );
    msg.lang = 'ja-JP';
    window.speechSynthesis.speak(msg);

    // 3秒後に元に戻す
    setTimeout(() => setResult(null), 3000);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      {/* 隠しinput（PaSoRiの入力を受け取る） */}
      <input
        ref={inputRef}
        onKeyDown={handleInput}
        className="opacity-0 absolute"
        readOnly={false}
      />

      {!result && !error && (
        <div className="text-center">
          <p className="text-4xl font-bold mb-4">ぎゅっと。</p>
          <p className="text-2xl text-gray-400">カードをタッチしてください</p>
        </div>
      )}

      {result && (
        <div className="text-center animate-pulse">
          <p className="text-6xl font-bold mb-6">
            {result.name} さん
          </p>
          <p className="text-4xl text-green-400">
            {result.type === 'clock_in' ? '✅ おはようございます' : '👋 おつかれさまでした'}
          </p>
        </div>
      )}

      {error && (
        <div className="text-center">
          <p className="text-4xl text-red-400">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}