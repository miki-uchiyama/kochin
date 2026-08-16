import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 利用者一覧を取得（登録画面のプルダウン用）
export async function GET() {
  try {
    const members = await sql`
      SELECT id, name FROM members ORDER BY name
    `;
    return NextResponse.json(members);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}

// カードを登録する
export async function POST(request: NextRequest) {
  try {
    const { member_id, card_id } = await request.json();

    if (!member_id || !card_id) {
      return NextResponse.json({ error: '利用者とカードを両方指定してください' }, { status: 400 });
    }

    // すでに同じカードが登録されていないか確認
    const existing = await sql`
      SELECT * FROM felica_cards WHERE card_id = ${card_id}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'このカードはすでに登録されています' }, { status: 400 });
    }

    await sql`
      INSERT INTO felica_cards (member_id, card_id)
      VALUES (${member_id}, ${card_id})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}