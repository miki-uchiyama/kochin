import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ぎゅっと。工賃管理",
  description: "ぎゅっと。工賃管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
        {children}
      </body>
    </html>
  );
}