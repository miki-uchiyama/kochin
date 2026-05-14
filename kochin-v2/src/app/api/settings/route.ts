import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const rows = await sql`SELECT key, value FROM settings`;
  const settings: Record<string, number> = {};
  rows.forEach(r => { settings[r.key] = Number(r.value); });
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const settings = await request.json();
  for (const [key, value] of Object.entries(settings)) {
    await sql`
      UPDATE settings SET value = ${value as number} WHERE key = ${key}
    `;
  }
  return NextResponse.json({ ok: true });
}