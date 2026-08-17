'use client';

import { useEffect, useRef, useState } from 'react';
import type { Template } from '@/lib/db';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected]   = useState<Template | null>(null);
  const [name, setName]           = useState('');
  const [desc, setDesc]           = useState('');
  const [content, setContent]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch('/api/templates');
    setTemplates(await res.json());
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!name) setName(file.name.replace(/\.tex$/, ''));
    const reader = new FileReader();
    reader.onload = ev => setContent(ev.target?.result as string ?? '');
    reader.readAsText(file);
  }

  async function save() {
    if (!name.trim() || !content.trim()) {
      setError('Nom et contenu LaTeX requis');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, content }),
    });
    if (res.ok) {
      setName(''); setDesc(''); setContent('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? 'Erreur');
    }
    setSaving(false);
  }

  async function del(id: number) {
    if (!confirm('Supprimer ce template ?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    await load();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Templates LaTeX</h1>
      <p className="text-slate-500 text-sm mb-8">
        Ajoute tes propres templates <code className="bg-slate-100 px-1 rounded">.tex</code>. Claude les remplira automatiquement avec ton profil lors de la génération.
      </p>

      <div className="grid grid-cols-5 gap-6">
        {/* ── Left: list ── */}
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-slate-600 uppercase mb-3">Mes templates</h2>

          {/* Built-in */}
          <div
            onClick={() => setSelected(null)}
            className={`rounded-lg border p-3 mb-2 cursor-pointer transition-all ${
              selected === null ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-slate-900">IIIT Vadodara (défaut)</p>
                <p className="text-xs text-slate-500 mt-0.5">Template ATS intégré</p>
              </div>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Intégré</span>
            </div>
          </div>

          {templates.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => setSelected(tpl)}
              className={`rounded-lg border p-3 mb-2 cursor-pointer transition-all ${
                selected?.id === tpl.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{tpl.name}</p>
                  {tpl.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{tpl.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">{new Date(tpl.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); del(tpl.id); }}
                  className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0 text-sm"
                >✕</button>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Aucun template personnalisé</p>
          )}
        </div>

        {/* ── Right: preview or add form ── */}
        <div className="col-span-3">
          {selected ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">{selected.name}</p>
                  {selected.description && <p className="text-xs text-slate-500">{selected.description}</p>}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(selected.content)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-600"
                >
                  📋 Copier
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-700 overflow-auto max-h-[500px] leading-relaxed bg-slate-50">
                {selected.content}
              </pre>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Ajouter un template</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nom du template *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ex: Deedy, Jake's Resume…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
                  <input
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="ex: 2 colonnes, style moderne…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Fichier .tex *
                  </label>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-lg p-6 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".tex"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="text-2xl">📄</span>
                    <span className="text-sm text-slate-500">
                      {content ? `${content.length.toLocaleString()} caractères chargés ✓` : 'Clique pour uploader un .tex'}
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Ou colle le LaTeX directement
                  </label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="\\documentclass{...}..."
                    rows={8}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                  />
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white py-2.5 rounded-lg font-semibold transition-colors"
                >
                  {saving ? 'Sauvegarde…' : '+ Ajouter le template'}
                </button>
              </div>
            </div>
          )}

          {/* Add new button when viewing a template */}
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full border border-dashed border-slate-300 hover:border-brand-400 text-slate-500 hover:text-brand-600 py-2.5 rounded-lg text-sm transition-colors"
            >
              + Ajouter un nouveau template
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
