import { NextRequest, NextResponse } from 'next/server';
import { getApplication } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const app = await getApplication(Number(id));
  if (!app?.cv_pdf_path) {
    return NextResponse.json({ error: 'PDF introuvable' }, { status: 404 });
  }

  const forceDownload = req.nextUrl.searchParams.get('dl') === '1';

  try {
    // Si c'est une URL Vercel Blob, on la proxifie pour contrôler les headers
    const res = await fetch(app.cv_pdf_path, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return NextResponse.json({ error: 'PDF inaccessible' }, { status: 502 });

    const buf  = await res.arrayBuffer();
    const name = `CV_${app.company}_${app.position}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(buf, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': forceDownload ? `attachment; filename="${name}"` : `inline; filename="${name}"`,
        'Cache-Control':       'private, max-age=3600',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
