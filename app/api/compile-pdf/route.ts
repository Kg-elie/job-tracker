import { NextRequest, NextResponse } from 'next/server';
import { getApplication, updateApplication } from '@/lib/db';
import { generateIIITVLatex, compileLatex } from '@/lib/latex';
import { log } from '@/lib/logger';
import type { Profile } from '@/lib/db';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { applicationId }: { applicationId: number } = await req.json();
    const app = await getApplication(applicationId);
    if (!app) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 });

    // Utilise le cv_json déjà sauvegardé par /api/generate
    const cvJson = JSON.parse(app.cv_json || '{}') as Profile;
    const latex  = app.cv_latex || generateIIITVLatex(cvJson);
    const fname  = `cv_${applicationId}_${Date.now()}`;

    log.info('compile-pdf: compilation', { applicationId });
    const compile = await compileLatex(latex, fname);

    if (compile.success) {
      await updateApplication(applicationId, { cv_pdf_path: compile.pdfPath ?? '' });
      log.info('compile-pdf: succès', { pdfPath: compile.pdfPath });
      return NextResponse.json({ ok: true, pdfPath: compile.pdfPath });
    }

    log.warn('compile-pdf: échec', { error: compile.error });
    return NextResponse.json({ ok: false, pdfError: compile.error });
  } catch (e) {
    log.error('compile-pdf: erreur', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
