import { NextRequest, NextResponse } from 'next/server';
import { getApplication, updateApplication, deleteApplication } from '@/lib/db';
import { log } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const app = await getApplication(Number(id));
  if (!app) {
    log.warn(`applications/${id}: introuvable`);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  log.info(`applications/${id}: récupérée`, { company: app.company });
  return NextResponse.json(app);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    await updateApplication(Number(id), body);
    log.info(`applications/${id}: mise à jour`, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error(`applications/${id} PATCH: erreur`, { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteApplication(Number(id));
  log.info(`applications/${id}: supprimée`);
  return NextResponse.json({ ok: true });
}
