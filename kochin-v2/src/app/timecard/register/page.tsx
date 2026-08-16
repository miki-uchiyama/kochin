'use client';

import { useEffect, useRef, useState } from 'react';

type Member = { id: number; name: string };

export default function RegisterPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [cardId, setCardId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/timecard/register')
      .then((res) => res.json())
      .then(setMembers);
  }, []);

  useEffect(() => {
    if (selectedId) inputRef.current?.focus();
  }, [selectedId]);

  const handleCardInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const value = (e.target as HTMLInputElement).value.trim();
    if (value) setCardId(value);
  };

  const handleRegister = async () => {
    if (!selectedId || !cardId) {
      setMessage({ type: 'error', text: '利用者とカードを両方指定してください' });
      return;
    }

    const res = await fetch('/api/timecard/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: Number(selectedId), card_id: cardId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: 'error', text: data.error });
      return;
    }

    setMessage({ type: 'success', text: '登録が完了しました！' });
    setSelectedId('');
    setCardId('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">カード登録</h1>

      <div className="max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-lg font-bold mb-2">① 利用者を選ぶ</label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setCardId('');
              setMessage(null);
            }}
            className="w-full border rounded p-3 text-lg"
          >
            <option value="">選択してください</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {selectedId && (
          <div>
            <label className="block text-lg font-bold mb-2">② カードをタッチ</label>
            <input
              ref={inputRef}
              onKeyDown={handleCardInput}
              placeholder="カードをタッチしてください"
              className="w-full border rounded p-3 text-lg"
            />
            {cardId && (
              <p className="mt-2 text-green-600 font-bold">✅ カードを読み取りました</p>
            )}
          </div>
        )}

        {message && (
          <p className={message.type === 'success' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
            {message.text}
          </p>
        )}

        <button
          onClick={handleRegister}
          disabled={!selectedId || !cardId}
          className="w-full bg-blue-600 text-white text-lg font-bold py-3 rounded disabled:bg-gray-300"
        >
          登録する
        </button>
      </div>
    </div>
  );
}