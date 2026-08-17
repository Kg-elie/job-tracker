import { NextRequest, NextResponse } from 'next/server';
import { listApplications, createApplication } from '@/lib/db';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    const apps = await listApplications();
    log.info('applications: liste récupérée', { count: apps.length });
    return NextResponse.json(apps);
  } catch (e) {
    log.error('applications GET: erreur', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = await createApplication(body);
    log.info('applications: candidature créée', { id, company: body.company, position: body.position });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    log.error('applications POST: erreur', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
