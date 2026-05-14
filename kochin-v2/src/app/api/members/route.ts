import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const members = await sql`
    SELECT id, name FROM members WHERE active = true ORDER BY name
  `;
  return NextResponse.json(members);
}

export async function POST(request: Request) {
    const { name } = await request.json();
    await sql`INSERT INTO members (name, service_type) VALUES (${name}, 'B')`;
    return NextResponse.json({ ok: true });
  }
  
  export async function PUT(request: Request) {
    const { id, active } = await request.json();
    await sql`UPDATE members SET active = ${active} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }