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
  const name = `CV_${app.company}_${app.position}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

  try {
    let buf: Buffer;

    if (app.cv_pdf_path.startsWith('data:application/pdf;base64,')) {
      // PDF stocké en base64 dans la DB (Vercel sans Blob)
      const b64 = app.cv_pdf_path.slice('data:application/pdf;base64,'.length);
      buf = Buffer.from(b64, 'base64');
    } else {
      // URL Vercel Blob ou chemin HTTP
      const res = await fetch(app.cv_pdf_path, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return NextResponse.json({ error: 'PDF inaccessible' }, { status: 502 });
      buf = Buffer.from(await res.arrayBuffer());
    }

    return new NextResponse(buf.buffer as ArrayBuffer, {
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
