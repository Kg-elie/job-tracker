import { NextRequest, NextResponse } from 'next/server';
import { getApplication, getTemplate, updateApplication } from '@/lib/db';
import { generateIIITVLatex, compileLatex } from '@/lib/latex';
import { log } from '@/lib/logger';
import type { Profile } from '@/lib/db';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { applicationId, cvJson }: { applicationId: number; cvJson: Profile } = await req.json();

    const app = await getApplication(applicationId);
    if (!app) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 });

    log.info('recompile: génération LaTeX depuis JSON édité', { applicationId });

    let latex: string;
    if (app.template_id) {
      const tpl = await getTemplate(app.template_id);
      latex = tpl ? generateIIITVLatex(cvJson) : generateIIITVLatex(cvJson);
    } else {
      latex = generateIIITVLatex(cvJson);
    }

    log.info('recompile: compilation PDF');
    const fname   = `cv_${applicationId}_${Date.now()}`;
    const compile = await compileLatex(latex, fname);

    await updateApplication(applicationId, {
      cv_json:     JSON.stringify(cvJson),
      cv_latex:    latex,
      cv_pdf_path: compile.pdfPath ?? app.cv_pdf_path,
    });

    if (compile.success) log.info('recompile: succès', { pdfPath: compile.pdfPath });
    else                 log.warn('recompile: PDF non compilé', { error: compile.error });

    return NextResponse.json({
      ok:       true,
      latex,
      pdfPath:  compile.pdfPath ?? null,
      pdfError: compile.error   ?? null,
    });
  } catch (e) {
    log.error('recompile: erreur', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
