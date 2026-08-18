import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = process.env.CLAUDE_MODEL ?? 'claude-sonnet-5';

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  created: string;
  contract_type?: string;
  contract_time?: string;
}

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
  score: number;       // 1-100 pertinence Claude
  reason: string;      // 1 phrase
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keywords = searchParams.get('q') || 'Data Analyst';
  const location = searchParams.get('where') || 'Paris';
  const contract = searchParams.get('contract') || '';   // permanent, contract, etc.

  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json(
      { error: 'ADZUNA_APP_ID et ADZUNA_APP_KEY non configurés dans les variables Vercel.' },
      { status: 503 }
    );
  }

  // ── 1. Adzuna search ──────────────────────────────────────────────────────
  const params = new URLSearchParams({
    app_id:           appId,
    app_key:          appKey,
    results_per_page: '15',
    what:             keywords,
    where:            location,
    'content-type':   'application/json',
  });
  if (contract) params.set('contract_type', contract);

  const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/fr/search/1?${params}`;
  const adzunaRes = await fetch(adzunaUrl);

  if (!adzunaRes.ok) {
    const txt = await adzunaRes.text();
    return NextResponse.json({ error: `Adzuna: ${adzunaRes.status} — ${txt}` }, { status: 502 });
  }

  const adzunaData = await adzunaRes.json() as { results: AdzunaJob[]; count: number };
  const jobs = adzunaData.results ?? [];

  if (jobs.length === 0) {
    return NextResponse.json({ results: [], total: 0 });
  }

  // ── 2. Claude scoring ─────────────────────────────────────────────────────
  const profile = await getProfile();

  const jobsForClaude = jobs.map((j, i) => ({
    i,
    title: j.title,
    company: j.company.display_name,
    description: j.description.slice(0, 300),
  }));

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Tu es un conseiller carrière. Évalue chaque offre sur 100 points selon sa pertinence pour ce candidat.
IMPORTANT: utilise TOUT l'intervalle 0-100. Une offre parfaite = 95+, très bonne = 75-90, correcte = 50-70, faible = 20-45, hors sujet = 0-20.

PROFIL CANDIDAT:
- Compétences: ${Object.values(profile.skills).flat().join(', ')}
- Expérience: ${profile.experience.map(e => `${e.role} chez ${e.company}`).join(', ')}
- Disponibilité: ${profile.availability}

OFFRES À ÉVALUER:
${jobsForClaude.map(j => `[${j.i}] ${j.title} — ${j.company}\n${j.description}`).join('\n\n')}

Réponds UNIQUEMENT avec ce JSON (pas de texte avant ou après):
[{"i": 0, "score": 82, "reason": "Python + Tableau requis, correspond parfaitement"}, {"i": 1, "score": 45, "reason": "hors secteur Finance"}, ...]`,
    }],
  });

  let scores: Array<{ i: number; score: number; reason: string }> = [];
  try {
    const text = msg.content.find(b => b.type === 'text')?.text ?? '[]';
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Array<{ i: number; score: number; reason: string }>;
      // Normalise si Claude répond sur 10 au lieu de 100
      const maxScore = Math.max(...parsed.map(p => p.score));
      scores = maxScore <= 10
        ? parsed.map(p => ({ ...p, score: Math.round(p.score * 10) }))
        : parsed;
    }
  } catch { scores = []; }

  // ── 3. Merge + sort ───────────────────────────────────────────────────────
  const results: SearchResult[] = jobs.map((j, i) => {
    const s = scores.find(x => x.i === i);
    let salary: string | undefined;
    if (j.salary_min && j.salary_max) {
      salary = `${Math.round(j.salary_min / 1000)}k–${Math.round(j.salary_max / 1000)}k €`;
    } else if (j.salary_min) {
      salary = `${Math.round(j.salary_min / 1000)}k €+`;
    }
    return {
      id:       j.id,
      title:    j.title,
      company:  j.company.display_name,
      location: j.location.display_name,
      description: j.description.slice(0, 400),
      salary,
      url:      j.redirect_url,
      created:  j.created,
      contract: j.contract_type ?? j.contract_time,
      score:    s?.score ?? 5,
      reason:   s?.reason ?? '',
    };
  });

  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({ results, total: adzunaData.count });
}
