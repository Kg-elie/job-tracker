import { NextResponse } from 'next/server';

export interface SearchResult {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  url: string;
  created: string;
  contract?: string;
  source?: string;
  score: number;
  reason: string;
}

export async function GET() {
  return NextResponse.json(
    { error: 'La recherche automatique et le scraping des offres sont désactivés.' },
    { status: 410 },
  );
}
