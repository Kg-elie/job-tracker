import { NextRequest, NextResponse } from 'next/server';
import { getApplication, updateApplication } from '@/lib/db';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const applicationId = Number(id);
  if (!Number.isInteger(applicationId)) {
    return NextResponse.json({ error: 'Candidature invalide' }, { status: 400 });
  }

  const app = await getApplication(applicationId);
  if (!app) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  const kind = form.get('kind');
  if (!(file instanceof File) || !['cv', 'letter'].includes(String(kind))) {
    return NextResponse.json({ error: 'PDF et type de document requis' }, { status: 400 });
  }
  if (file.type !== 'application/pdf' || file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Le fichier doit être un PDF de 10 Mo maximum' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const header = bytes.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    return NextResponse.json({ error: 'Le fichier sélectionné n’est pas un PDF valide' }, { status: 400 });
  }

  const filename = `${String(kind)}_${applicationId}_${Date.now()}.pdf`;
  let url: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const result = await put(`applications/${applicationId}/${filename}`, bytes, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: false,
    });
    url = result.url;
  } else {
    url = `data:application/pdf;base64,${bytes.toString('base64')}`;
  }

  const field: 'cv_pdf_path' | 'letter_pdf_path' = kind === 'cv' ? 'cv_pdf_path' : 'letter_pdf_path';
  await updateApplication(applicationId, { [field]: url });
  return NextResponse.json({ ok: true, field, url });
}
