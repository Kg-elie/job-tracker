import { NextRequest, NextResponse } from 'next/server';
import { analyzeJob } from '@/lib/claude';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  log.info('analyze-job: requête reçue');
  try {
    const { jobText } = await req.json();
    if (!jobText?.trim()) {
      log.warn('analyze-job: jobText manquant');
      return NextResponse.json({ error: 'jobText manquant' }, { status: 400 });
    }
    log.info('analyze-job: envoi à Claude', { chars: jobText.length });
    const analysis = await analyzeJob(jobText);
    log.info('analyze-job: succès', { company: analysis.company, position: analysis.position });
    return NextResponse.json(analysis);
  } catch (e) {
    log.error('analyze-job: erreur', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
