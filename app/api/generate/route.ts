import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'La génération automatique de CV et de lettres est désactivée.' },
    { status: 410 },
  );
}
