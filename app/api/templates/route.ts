import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, createTemplate } from '@/lib/db';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    const templates = await listTemplates();
    return NextResponse.json(templates);
  } catch (e) {
    log.error('templates GET: erreur', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, content } = await req.json();
    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'name et content requis' }, { status: 400 });
    }
    const id = await createTemplate({ name: name.trim(), description: description ?? '', content: content.trim() });
    log.info('templates: nouveau template créé', { id, name });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    log.error('templates POST: erreur', { error: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
