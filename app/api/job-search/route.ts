import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = process.env.CLAUDE_MODEL ?? 'claude-sonnet-5';

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
  source?: string;   // LinkedIn, Indeed, Glassdoor…
  score: number;
  reason: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keywords  = searchParams.get('q')        || 'Data Analyst';
  const location  = searchParams.get('where')     || 'Paris, France';
  const contract  = searchParams.get('contract')  || '';
  const datePosted = searchParams.get('date')     || 'all'; // all | today | 3days | week | month

  const rapidKey = process.env.RAPIDAPI_KEY;
  if (!rapidKey) {
    return NextResponse.json(
      { error: 'RAPIDAPI_KEY non configurée dans les variables Vercel.' },
      { status: 503 }
    );
  }

  // ── 1. JSearch (Google Jobs) via /search-v2 ──────────────────────────────
  const query = location ? `${keywords} in ${location}` : keywords;

  const jsearchParams = new URLSearchParams({
    query,
    num_pages:   '1',
    country:     'fr',
    date_posted: datePosted === 'all' ? 'all' : datePosted,
  });
  if (contract) jsearchParams.set('employment_types', contractToJSearch(contract));

  const jsearchRes = await fetch(
    `https://jsearch.p.rapidapi.com/search-v5?${jsearchParams}`,
    {
      headers: {
        'x-rapidapi-key':  rapidKey,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'Content-Type':    'application/json',
      },
    }
  );

  if (!jsearchRes.ok) {
    const txt = await jsearchRes.text();
    console.error('JSearch error:', jsearchRes.status, txt);
    return NextResponse.json(
      { error: `JSearch ${jsearchRes.status}: ${txt.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const jsearchData = await jsearchRes.json() as {
    data?: Array<{
      job_id: string;
      job_title: string;
      employer_name: string;
      job_city?: string;
      job_country?: string;
      job_description: string;
      job_apply_link: string;
      job_posted_at_datetime_utc: string;
      job_min_salary?: number;
      job_max_salary?: number;
      job_salary_currency?: string;
      job_employment_type?: string;
      job_publisher?: string;
    }>;
    status: string;
  };

  const jobs = jsearchData.data ?? [];
  if (jobs.length === 0) return NextResponse.json({ results: [], total: 0 });

  // ── 2. Claude scoring ─────────────────────────────────────────────────────
  const profile = await getProfile();

  const jobsForClaude = jobs.map((j, i) => ({
    i,
    title:       j.job_title,
    company:     j.employer_name,
    description: j.job_description.slice(0, 300),
  }));

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Tu es un conseiller carrière. Évalue chaque offre sur 100 points selon sa pertinence pour ce candidat.
IMPORTANT: utilise TOUT l'intervalle 0-100. Parfait = 90+, très bon = 70-89, correct = 50-69, faible = 20-49, hors sujet = 0-19.

PROFIL CANDIDAT:
- Compétences: ${Object.values(profile.skills).flat().join(', ')}
- Expérience: ${profile.experience.map(e => `${e.role} chez ${e.company}`).join(', ')}
- Disponibilité: ${profile.availability}

OFFRES:
${jobsForClaude.map(j => `[${j.i}] ${j.title} — ${j.company}\n${j.description}`).join('\n\n')}

Réponds UNIQUEMENT avec ce JSON (sans texte avant/après):
[{"i": 0, "score": 82, "reason": "Python + Tableau requis, correspond parfaitement"}, ...]`,
    }],
  });

  let scores: Array<{ i: number; score: number; reason: string }> = [];
  try {
    const text  = msg.content.find(b => b.type === 'text')?.text ?? '[]';
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Array<{ i: number; score: number; reason: string }>;
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
    if (j.job_min_salary && j.job_max_salary) {
      const cur = j.job_salary_currency === 'EUR' ? '€' : (j.job_salary_currency ?? '€');
      salary = `${Math.round(j.job_min_salary / 1000)}k–${Math.round(j.job_max_salary / 1000)}k ${cur}`;
    } else if (j.job_min_salary) {
      salary = `${Math.round(j.job_min_salary / 1000)}k €+`;
    }
    return {
      id:          j.job_id,
      title:       j.job_title,
      company:     j.employer_name,
      location:    [j.job_city, j.job_country].filter(Boolean).join(', '),
      description: j.job_description.slice(0, 400),
      salary,
      url:         j.job_apply_link,
      created:     j.job_posted_at_datetime_utc,
      contract:    j.job_employment_type,
      source:      j.job_publisher,
      score:       s?.score ?? 50,
      reason:      s?.reason ?? '',
    };
  });

  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({ results, total: results.length });
}

function contractToJSearch(c: string): string {
  const map: Record<string, string> = {
    permanent: 'FULLTIME',
    contract:  'CONTRACTOR,PARTTIME',
    part_time: 'INTERN',
  };
  return map[c] ?? '';
}
