import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// アイコン画像を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await sql`SELECT icon_image, icon_mimetype FROM members WHERE id = ${id}`;

    if (rows.length === 0 || !rows[0].icon_image) {
      return NextResponse.json({ error: 'no icon' }, { status: 404 });
    }

    const raw = rows[0].icon_image as unknown;
    let imgBuffer: Buffer;
    if (typeof raw === 'string') {
      imgBuffer = Buffer.from(raw.startsWith('\\x') ? raw.slice(2) : raw, 'hex');
    } else {
      imgBuffer = Buffer.from(raw as ArrayBuffer);
    }

    return new NextResponse(new Uint8Array(imgBuffer), {
      headers: {
        'Content-Type': rows[0].icon_mimetype || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}

// アイコン画像をアップロード
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '画像が選択されていません' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hex = buffer.toString('hex');

    await sql`
      UPDATE members
      SET icon_image = decode(${hex}, 'hex'), icon_mimetype = ${file.type}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
