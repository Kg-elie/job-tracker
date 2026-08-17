import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { log } from '@/lib/logger';

// Tags whose content we discard entirely
const SKIP_TAGS = new Set(['script','style','noscript','header','footer','nav','aside','svg','img']);

function extractText(html: string): string {
  const root = parse(html);

  // Remove noise tags
  SKIP_TAGS.forEach(tag => root.querySelectorAll(tag).forEach((n: { remove(): void }) => n.remove()));

  // Try to find the main content block first
  const candidates = [
    root.querySelector('main'),
    root.querySelector('[class*="job-description"]'),
    root.querySelector('[class*="jobDescription"]'),
    root.querySelector('[class*="offer-description"]'),
    root.querySelector('[class*="description"]'),
    root.querySelector('article'),
    root.querySelector('#job-description'),
    root.querySelector('.content'),
    root.querySelector('body'),
  ];

  const container = candidates.find(n => n && n.text.trim().length > 100) ?? root;

  return container.text
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .join('\n')
    .slice(0, 12000); // cap to avoid huge Claude prompts
}

export async function POST(req: NextRequest) {
  let url = '';
  try {
    ({ url } = await req.json());
    if (!url?.startsWith('http')) {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    log.info('scrape-job: fetching', { url });

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      log.warn('scrape-job: réponse HTTP non-OK', { status: res.status, url });
      return NextResponse.json({ error: `Le site a répondu ${res.status}. Colle le texte manuellement.` }, { status: 422 });
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'La page n\'est pas du HTML. Colle le texte manuellement.' }, { status: 422 });
    }

    const html = await res.text();
    const text = extractText(html);

    if (text.length < 100) {
      log.warn('scrape-job: texte trop court (page probablement rendue côté client)', { url, length: text.length });
      return NextResponse.json({
        error: 'La page semble être rendue en JavaScript (LinkedIn, etc.). Colle le texte de l\'offre manuellement.',
        partial: text,
      }, { status: 422 });
    }

    log.info('scrape-job: succès', { url, chars: text.length });
    return NextResponse.json({ text });

  } catch (e) {
    log.error('scrape-job: erreur', { url, error: String(e) });
    return NextResponse.json({ error: 'Impossible de récupérer la page. Colle le texte manuellement.' }, { status: 500 });
  }
}
