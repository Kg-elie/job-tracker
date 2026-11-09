import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: "L'analyse automatique des offres est désactivée." },
    { status: 410 },
  );
}
