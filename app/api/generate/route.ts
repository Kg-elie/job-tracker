import { NextRequest, NextResponse } from 'next/server';
import { getProfile, getTemplate, updateApplication } from '@/lib/db';
import { generateCV, generateCoverLetter, fillTemplate } from '@/lib/claude';
import { generateIIITVLatex, compileLatex } from '@/lib/latex';
import { log } from '@/lib/logger';
import type { JobAnalysis } from '@/lib/claude';

// Vercel : 60s max sur Hobby, 300s sur Pro
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  log.info('generate: requête reçue');
  try {
    const { applicationId, analysis, templateId }: {
      applicationId: number;
      analysis: JobAnalysis;
      templateId?: number | null;
    } = await req.json();

    log.info('generate: chargement profil + génération en parallèle', { applicationId });
    const profile = await getProfile();

    // CV et lettre en parallèle — gain de ~15-20s
    const [tailoredCV, letter] = await Promise.all([
      generateCV(profile, analysis),
      generateCoverLetter(profile, analysis),
    ]);
    log.info('generate: CV + lettre générés');

    let latex: string;
    if (templateId) {
      const tpl = await getTemplate(templateId);
      latex = tpl
        ? await fillTemplate(tailoredCV, analysis, tpl.content)
        : generateIIITVLatex(tailoredCV);
    } else {
      latex = generateIIITVLatex(tailoredCV);
    }

    // Compilation PDF — on ne bloque pas si ça timeout
    log.info('generate: compilation PDF');
    const fname   = `cv_${applicationId}_${Date.now()}`;
    const compile = await Promise.race([
      compileLatex(latex, fname),
      new Promise<{ success: false; error: string; latexSource: string }>(resolve =>
        setTimeout(() => resolve({ success: false, error: 'timeout', latexSource: latex }), 25_000)
      ),
    ]);

    if (compile.success) log.info('generate: PDF compilé', { path: compile.pdfPath });
    else                 log.warn('generate: PDF non compilé', { error: compile.error });

    await updateApplication(applicationId, {
      cv_json:     JSON.stringify(tailoredCV),
      cv_latex:    latex,
      cv_pdf_path: compile.pdfPath ?? '',
      letter_text: letter,
      job_analysis: JSON.stringify(analysis),
      template_id: templateId ?? null,
    });
    log.info('generate: candidature mise à jour', { applicationId });

    return NextResponse.json({
      ok:       true,
      cvLatex:  latex,
      letter,
      pdfPath:  compile.pdfPath ?? null,
      pdfError: compile.error   ?? null,
    });
  } catch (e) {
    log.error('generate: erreur fatale', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
