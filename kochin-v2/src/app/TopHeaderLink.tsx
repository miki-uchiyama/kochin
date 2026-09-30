'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopHeaderLink() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <header style={{
      padding: '10px 16px',
      borderBottom: '1px solid #e0e0e0',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <Link href="/" style={{
        fontSize: '15px',
        color: '#c8702a',
        textDecoration: 'none',
        border: '1px solid #c8702a',
        padding: '4px 12px',
        borderRadius: '6px',
      }}>
        ⬅ トップへ
      </Link>
    </header>
  );
}
