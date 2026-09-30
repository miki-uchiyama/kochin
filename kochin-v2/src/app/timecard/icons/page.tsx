'use client';

import { useEffect, useState } from 'react';

type Member = { id: number; name: string };

export default function IconsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/timecard/register')
      .then((res) => res.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []));
  }, []);

  const handleUpload = async (memberId: number, file: File) => {
    setUploading(memberId);
    const formData = new FormData();
    formData.append('file', file);
    await fetch(`/api/timecard/icon/${memberId}`, { method: 'POST', body: formData });
    setUploading(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '24px' }}>
      <a
        href="/"
        style={{
          display: 'inline-block', marginBottom: '16px', padding: '10px 16px',
          border: '1px solid #ccc', borderRadius: '8px', textDecoration: 'none',
          color: '#333', backgroundColor: 'white',
        }}
      >
        ◀ トップへ
      </a>

      <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        利用者アイコン設定
      </p>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '12px', borderBottom: '1px solid #eee', backgroundColor: 'white',
            }}
          >
            <img
              key={`${m.id}-${refreshKey}`}
              src={`/api/timecard/icon/${m.id}?t=${refreshKey}`}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.visibility = 'hidden';
              }}
              style={{
                width: '60px', height: '60px', borderRadius: '12px',
                objectFit: 'cover', backgroundColor: '#eee', flexShrink: 0,
              }}
            />
            <p style={{ flex: 1, fontSize: '18px' }}>{m.name}</p>
            <label
              style={{
                padding: '8px 16px', backgroundColor: '#e07b00', color: 'white',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap',
              }}
            >
              {uploading === m.id ? '保存中...' : '画像を選ぶ'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(m.id, file);
                }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
