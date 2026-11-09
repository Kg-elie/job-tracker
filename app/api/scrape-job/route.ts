import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Le scraping des offres est désactivé. Ajoutez les informations manuellement.' },
    { status: 410 },
  );
}
