import Link from 'next/link';

export default function Home() {
  return (
    <main id="top-page" style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>

      <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#e07b00' }}>ぎゅっと。タイムカード</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link href="/timecard"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#e07b00',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          タイムカード
        </Link>
        <Link href="/timecard/register"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#2196F3',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          カード登録
        </Link>

        <Link href="/timecard/list"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#009688',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          タイムカード一覧
        </Link>

        <Link href="/timecard/monthly"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#673AB7',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          月別タイムカード
        </Link>

        <Link href="/timecard/icons"
          style={{ padding: '20px', fontSize: '18px', textAlign: 'center', backgroundColor: '#e91e63',
            color: 'white', borderRadius: '8px', textDecoration: 'none', display: 'block' }}>
          利用者アイコン設定
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
