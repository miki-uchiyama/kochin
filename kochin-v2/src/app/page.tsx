import Link from 'next/link';

export default function Home() {
  return (
    <main id="top-page" style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>

      <div style={{ textAlign: 'right', marginBottom: '8px' }}>
        <a href="https://mams-hug-portal.vercel.app/gyutto"
          style={{ fontSize: '15px', color: '#4CAF50', textDecoration: 'none',
            border: '1px solid #4CAF50', padding: '4px 12px', borderRadius: '6px' }}>
          ⬅ ぎゅっとへ戻る
        </a>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#e07b00' }}>ぎゅっと。工賃管理</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link href="/input"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#4CAF50',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          日々入力
        </Link>
        <Link href="/edit"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#2196F3',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          修正（日付別）
        </Link>
        <Link href="/edit-member"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#2196F3',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          修正（利用者別）
        </Link>
        <Link href="/summary"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#e07b00',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          集計・工賃計算
        </Link>

        <Link href="/timecard"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#673AB7',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          タイムカード
        </Link>
        <Link href="/timecard/register"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#673AB7',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          カード登録
        </Link>

        <Link href="/settings"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#9E9E9E',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          設定
        </Link>
      </div>
    </main>
  );
}