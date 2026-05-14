import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const members = await sql`
    SELECT id, name FROM members WHERE active = true ORDER BY name
  `;
  return NextResponse.json(members);
}