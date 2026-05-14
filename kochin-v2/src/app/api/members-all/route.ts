import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const members = await sql`
    SELECT id, name, active FROM members ORDER BY name
  `;
  return NextResponse.json(members);
}