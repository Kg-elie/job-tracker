import { NextRequest, NextResponse } from 'next/server';
import { getProfile, getTemplate, updateApplication } from '@/lib/db';
import { generateCV, generateCoverLetter, fillTemplate } from '@/lib/claude';
import { generateIIITVLatex, compileLatex } from '@/lib/latex';
import { log } from '@/lib/logger';
import type { JobAnalysis } from '@/lib/claude';

export async function POST(req: NextRequest) {
  log.info('generate: requête reçue');
  try {
    const { applicationId, analysis, templateId }: {
      applicationId: number;
      analysis: JobAnalysis;
      templateId?: number | null;
    } = await req.json();

    log.info('generate: chargement du profil');
    const profile = await getProfile();

    log.info('generate: génération CV tailorisé via Claude', { applicationId });
    const tailoredCV = await generateCV(profile, analysis);
    log.info('generate: CV JSON généré');

    log.info('generate: génération lettre via Claude');
    const letter = await generateCoverLetter(profile, analysis);
    log.info('generate: lettre générée');

    let latex: string;
    if (templateId) {
      const tpl = await getTemplate(templateId);
      if (tpl) {
        log.info('generate: utilisation template personnalisé', { templateId, name: tpl.name });
        latex = await fillTemplate(tailoredCV, analysis, tpl.content);
      } else {
        log.warn('generate: template introuvable, fallback IIITV', { templateId });
        latex = generateIIITVLatex(tailoredCV);
      }
    } else {
      log.info('generate: génération LaTeX IIITV (défaut)');
      latex = generateIIITVLatex(tailoredCV);
    }

    log.info('generate: compilation PDF');
    const fname   = `cv_${applicationId}_${Date.now()}`;
    const compile = await compileLatex(latex, fname);

    if (compile.success) {
      log.info('generate: PDF compilé', { path: compile.pdfPath });
    } else {
      log.warn('generate: PDF non compilé', { error: compile.error });
    }

    await updateApplication(applicationId, {
      cv_json:      JSON.stringify(tailoredCV),
      cv_latex:     latex,
      cv_pdf_path:  compile.pdfPath ?? '',
      letter_text:  letter,
      job_analysis: JSON.stringify(analysis),
      template_id:  templateId ?? null,
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
