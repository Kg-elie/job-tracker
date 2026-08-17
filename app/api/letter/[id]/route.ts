import { NextRequest, NextResponse } from 'next/server';
import { getApplication, getProfile } from '@/lib/db';
import { generateLetterLatex, compileLatex } from '@/lib/latex';

export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [app, profile] = await Promise.all([
    getApplication(Number(id)),
    getProfile(),
  ]);

  if (!app?.letter_text) {
    return NextResponse.json({ error: 'Lettre introuvable' }, { status: 404 });
  }

  const latex  = generateLetterLatex(
    app.letter_text,
    { name: profile.name, email: profile.email, phone: profile.phone, location: profile.location },
    { company: app.company, position: app.position },
  );
  const fname  = `lettre_${id}_${Date.now()}`;
  const result = await compileLatex(latex, fname);

  if (!result.success || !result.pdfPath) {
    return NextResponse.json({ error: result.error ?? 'Compilation échouée' }, { status: 500 });
  }

  const name = `Lettre_${app.position}_${app.company}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

  // data URL → renvoyer directement le PDF
  if (result.pdfPath.startsWith('data:application/pdf;base64,')) {
    const buf = Buffer.from(result.pdfPath.slice('data:application/pdf;base64,'.length), 'base64');
    return new NextResponse(buf.buffer as ArrayBuffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  }

  // Blob URL → proxy
  const res = await fetch(result.pdfPath, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return NextResponse.json({ error: 'PDF inaccessible' }, { status: 502 });
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf.buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}
