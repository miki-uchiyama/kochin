import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const groups = await sql`
    SELECT id, name, coefficient FROM groups WHERE active = true ORDER BY id
  `;
  return NextResponse.json(groups);
}