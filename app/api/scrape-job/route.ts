import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { log } from '@/lib/logger';

const SKIP_TAGS = new Set(['script','style','noscript','header','footer','nav','aside','svg','img']);

function extractText(html: string): string {
  const root = parse(html);
  SKIP_TAGS.forEach(tag => root.querySelectorAll(tag).forEach((n: { remove(): void }) => n.remove()));

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
    .slice(0, 12000);
}

async function fetchDirect(url: string): Promise<{ html: string; ok: boolean; status: number }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });
  const html = res.ok ? await res.text() : '';
  return { html, ok: res.ok, status: res.status };
}

async function fetchViaScraperAPI(url: string): Promise<{ html: string; ok: boolean }> {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) return { html: '', ok: false };

  // render=true = headless browser (gère LinkedIn, Indeed, etc.)
  const apiUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&render=true&country_code=fr`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(60_000) });
  const html = res.ok ? await res.text() : '';
  return { html, ok: res.ok };
}

export async function POST(req: NextRequest) {
  let url = '';
  try {
    ({ url } = await req.json());
    if (!url?.startsWith('http')) {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    log.info('scrape-job: tentative directe', { url });

    // 1. Essai direct
    let html = '';
    try {
      const direct = await fetchDirect(url);
      if (direct.ok) html = direct.html;
      else log.warn('scrape-job: direct échoué', { status: direct.status });
    } catch (e) {
      log.warn('scrape-job: direct timeout/erreur', { error: String(e) });
    }

    // 2. Si texte insuffisant → ScraperAPI
    let usedProxy = false;
    if (extractText(html).length < 200 && process.env.SCRAPER_API_KEY) {
      log.info('scrape-job: fallback ScraperAPI');
      const proxy = await fetchViaScraperAPI(url);
      if (proxy.ok && proxy.html.length > html.length) {
        html = proxy.html;
        usedProxy = true;
      }
    }

    const text = extractText(html);

    if (text.length < 100) {
      return NextResponse.json({
        error: process.env.SCRAPER_API_KEY
          ? 'Impossible de récupérer le contenu même via proxy. Colle le texte manuellement.'
          : 'La page est protégée. Colle le texte manuellement (ou configure SCRAPER_API_KEY).',
        partial: text,
      }, { status: 422 });
    }

    log.info('scrape-job: succès', { url, chars: text.length, usedProxy });
    return NextResponse.json({ text, usedProxy });

  } catch (e) {
    log.error('scrape-job: erreur', { url, error: String(e) });
    return NextResponse.json({ error: 'Impossible de récupérer la page. Colle le texte manuellement.' }, { status: 500 });
  }
}
