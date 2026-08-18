'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Application, Profile, Experience, Education } from '@/lib/db';

const STATUS_CONFIG = {
  interested: { label: 'Intéressé',  color: 'bg-blue-100 text-blue-700'    },
  pending:    { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  interview:  { label: 'Entretien',  color: 'bg-purple-100 text-purple-700' },
  rejected:   { label: 'Refus',      color: 'bg-red-100 text-red-700'      },
  accepted:   { label: 'Accepté',    color: 'bg-green-100 text-green-700'  },
} as const;
type Status = keyof typeof STATUS_CONFIG;
type Tab = 'edit' | 'pdf' | 'cv' | 'letter' | 'details';

function parseCV(raw: string): Profile | null {
  try { return JSON.parse(raw) as Profile; } catch { return null; }
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [app, setApp]         = useState<Application | null>(null);
  const [tab, setTab]         = useState<Tab>('edit');
  const [notes, setNotes]     = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [cv, setCv]           = useState<Profile | null>(null);
  const [recompiling, setRecompiling] = useState(false);
  const [recompileMsg, setRecompileMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]         = useState<string | null>(null);
  const [letter, setLetter]         = useState('');
  const [letterSaving, setLetterSaving] = useState(false);
  const [letterSaved, setLetterSaved]   = useState(false);

  function shareFile(path: string, title: string, key: string) {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      // iOS : ouvre la feuille de partage native (Safari, Fichiers, AirDrop…)
      navigator.share({ title, url }).catch(() => {});
    } else {
      // Desktop : copie le lien
      navigator.clipboard.writeText(url).then(() => {
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
      });
    }
  }

  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then(r => r.json())
      .then((data: Application & { error?: string }) => {
        if (data.error) { setLoading(false); return; } // 404
        setApp(data);
        setNotes(data.notes ?? '');
        setLetter(data.letter_text ?? '');
        const parsed = parseCV(data.cv_json);
        if (parsed) setCv(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: Status) {
    await fetch(`/api/applications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setApp(prev => prev ? { ...prev, status } : null);
  }

  async function saveNotes() {
    await fetch(`/api/applications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) });
    setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2000);
  }

  async function saveLetter() {
    setLetterSaving(true);
    await fetch(`/api/applications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ letter_text: letter }) });
    setApp(prev => prev ? { ...prev, letter_text: letter } : null);
    setLetterSaving(false);
    setLetterSaved(true);
    setTimeout(() => setLetterSaved(false), 2000);
  }

  async function handleRecompile() {
    if (!cv) return;
    setRecompiling(true);
    setRecompileMsg('');
    try {
      const res = await fetch('/api/recompile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: Number(id), cvJson: cv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApp(prev => prev ? {
        ...prev,
        cv_json:    JSON.stringify(cv),
        cv_latex:   data.latex,
        cv_pdf_path: data.pdfPath ?? prev.cv_pdf_path,
      } : null);
      if (data.pdfPath) {
        setRecompileMsg('✅ PDF généré !');
        setTab('pdf');
      } else {
        setRecompileMsg(`⚠️ LaTeX mis à jour, compilation échouée.\nErreur : ${data.pdfError ?? 'inconnue'}`);
      }
    } catch (e) {
      setRecompileMsg(`❌ Erreur : ${String(e)}`);
    }
    setRecompiling(false);
  }

  async function deleteApp() {
    if (!confirm('Supprimer cette candidature ?')) return;
    await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    router.push('/');
  }

  // ── CV field helpers ────────────────────────────────────────────────────────
  function updateExp(i: number, field: keyof Experience, val: string | string[]) {
    if (!cv) return;
    const exp = [...cv.experience];
    exp[i] = { ...exp[i], [field]: val };
    setCv({ ...cv, experience: exp });
  }

  if (loading) return <div className="text-center py-20 text-slate-400 animate-pulse">Chargement…</div>;
  if (!app)   return <div className="text-center py-20 text-slate-400">Introuvable</div>;

  const cfg      = STATUS_CONFIG[app.status as Status] ?? STATUS_CONFIG.interested;
  const analysis = (() => { try { return JSON.parse(app.job_analysis); } catch { return null; } })();

  const TABS: { key: Tab; label: string }[] = [
    { key: 'edit',    label: '✏️ Éditer CV' },
    { key: 'pdf',     label: '📄 PDF' },
    { key: 'cv',      label: '</> LaTeX' },
    { key: 'letter',  label: '✉️ Lettre' },
    { key: 'details', label: '📋 Détails' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-600 text-sm mb-3 flex items-center gap-1">← Retour</button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{app.position}</h1>
            <p className="text-slate-600 font-medium">{app.company}</p>
            {app.job_url && <a href={app.job_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-xs mt-1 inline-block">🔗 Offre originale</a>}
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
            <select value={app.status} onChange={e => updateStatus(e.target.value as Status)}
              className={`text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded-full border-0 cursor-pointer ${cfg.color}`}>
              {Object.entries(STATUS_CONFIG).map(([s, c]) => <option key={s} value={s}>{c.label}</option>)}
            </select>
            <button onClick={deleteApp} className="text-red-400 hover:text-red-600 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50">Supprimer</button>
          </div>
        </div>
      </div>

      {/* Tabs — scrollable horizontally on mobile */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ TAB: Structured CV Editor ══ */}
      {tab === 'edit' && (
        <div className="space-y-4">
          {!cv ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              <p className="text-4xl mb-3">📭</p>
              <p>CV non encore généré pour cette candidature.</p>
            </div>
          ) : (
            <>
              {/* Résumé */}
              <Section title="Résumé / Accroche">
                <textarea
                  value={cv.summary}
                  onChange={e => setCv({ ...cv, summary: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </Section>

              {/* Expérience */}
              <Section title="Expérience professionnelle">
                {cv.experience.map((exp, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4 mb-3 bg-slate-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <Field label="Entreprise" value={exp.company}  onChange={v => updateExp(i,'company',v)} />
                      <Field label="Rôle"       value={exp.role}     onChange={v => updateExp(i,'role',v)} />
                      <Field label="Lieu"       value={exp.location} onChange={v => updateExp(i,'location',v)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Début" value={exp.start} onChange={v => updateExp(i,'start',v)} />
                        <Field label="Fin"   value={exp.end}   onChange={v => updateExp(i,'end',v)} />
                      </div>
                    </div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bullets (un par ligne)</label>
                    <textarea
                      value={exp.bullets.join('\n')}
                      onChange={e => updateExp(i, 'bullets', e.target.value.split('\n'))}
                      rows={5}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                    />
                  </div>
                ))}
              </Section>

              {/* Compétences */}
              <Section title="Compétences techniques">
                {Object.entries(cv.skills).map(([cat, items]) => (
                  <div key={cat} className="mb-3">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{cat}</label>
                    <input
                      value={items.join(', ')}
                      onChange={e => setCv({ ...cv, skills: { ...cv.skills, [cat]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                ))}
              </Section>

              {/* Projets */}
              <Section title="Projets">
                {cv.projects.map((p, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-3 mb-2 bg-slate-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <Field label="Nom"  value={p.name} onChange={v => { const pr=[...cv.projects]; pr[i]={...pr[i],name:v}; setCv({...cv,projects:pr}); }} />
                      <Field label="Date" value={p.date} onChange={v => { const pr=[...cv.projects]; pr[i]={...pr[i],date:v}; setCv({...cv,projects:pr}); }} />
                    </div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
                    <textarea
                      value={p.description}
                      onChange={e => { const pr=[...cv.projects]; pr[i]={...pr[i],description:e.target.value}; setCv({...cv,projects:pr}); }}
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                    />
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 mt-2">Stack (virgule)</label>
                    <input
                      value={p.tech.join(', ')}
                      onChange={e => { const pr=[...cv.projects]; pr[i]={...pr[i],tech:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}; setCv({...cv,projects:pr}); }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                ))}
              </Section>

              {/* Recompile bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  {recompileMsg ? (
                    <span className={recompileMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}>{recompileMsg}</span>
                  ) : (
                    <span>Modifie les sections ci-dessus, puis recompile pour mettre à jour le CV.</span>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {app.cv_pdf_path && (
                    <a href={app.cv_pdf_path} target="_blank"
                       className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium">
                      ⬇ PDF
                    </a>
                  )}
                  <button
                    onClick={handleRecompile}
                    disabled={recompiling}
                    className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {recompiling ? <span className="flex items-center gap-1.5"><span className="animate-spin">⟳</span> Recompile…</span> : '🔄 Sauvegarder & Recompiler'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ TAB: PDF viewer ══ */}
      {tab === 'pdf' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {app.cv_pdf_path ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Aperçu PDF</span>
                <div className="flex gap-2 flex-wrap justify-end">
                  <a
                    href={`/api/pdf/${app.id}?dl=1`}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                  >⬇ Télécharger</a>
                  <a
                    href={`/api/pdf/${app.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium"
                  >↗ Ouvrir</a>
                  <button
                    onClick={() => shareFile(`/api/pdf/${app.id}?dl=1`, `CV_${app.position}_${app.company}`, 'pdf')}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-lg font-medium"
                  >{copied === 'pdf' ? '✅ Lien copié !' : '🔗 Partager'}</button>
                </div>
              </div>
              <iframe
                src={`/api/pdf/${app.id}#toolbar=1&view=FitH`}
                className="w-full"
                style={{ height: '80vh', border: 'none' }}
                title="CV PDF"
              />
            </>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="font-medium mb-1">Aucun PDF disponible</p>
              <p className="text-sm">Lance "Sauvegarder &amp; Recompiler" dans l'onglet <strong>Éditer CV</strong> pour générer le PDF via le cloud.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: LaTeX Source ══ */}
      {tab === 'cv' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Source LaTeX</span>
            <div className="flex gap-2 flex-wrap justify-end">
              {app.cv_pdf_path && (
                <a href={`/api/pdf/${app.id}?dl=1`} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">⬇ PDF</a>
              )}
              {app.cv_latex && (<>
                <button
                  onClick={() => {
                    const blob = new Blob([app.cv_latex], { type: 'text/plain' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href     = url;
                    a.download = `cv_${app.company}_${app.position}.tex`.replace(/[^a-zA-Z0-9._-]/g, '_');
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                >⬇ .tex</button>
                <button
                  onClick={() => {
                    // Overleaf "Open in Overleaf" — encode le LaTeX en base64 et l'envoie en POST
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = 'https://www.overleaf.com/docs';
                    form.target = '_blank';
                    const nameInput = document.createElement('input');
                    nameInput.type  = 'hidden';
                    nameInput.name  = 'snip_name';
                    nameInput.value = `CV_${app?.company ?? 'CV'}`;
                    form.appendChild(nameInput);
                    const snipInput = document.createElement('input');
                    snipInput.type  = 'hidden';
                    snipInput.name  = 'encoded_snip';
                    snipInput.value = btoa(unescape(encodeURIComponent(app?.cv_latex ?? '')));
                    form.appendChild(snipInput);
                    document.body.appendChild(form);
                    form.submit();
                    document.body.removeChild(form);
                  }}
                  className="bg-green-700 hover:bg-green-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                >🍃 Overleaf</button>
                <button
                  onClick={() => navigator.clipboard.writeText(app.cv_latex)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium"
                >📋 Copier</button>
              </>)}
            </div>
          </div>
          {app.cv_latex
            ? <pre className="p-4 text-xs font-mono text-slate-700 overflow-auto max-h-[600px] leading-relaxed">{app.cv_latex}</pre>
            : <div className="p-8 text-center text-slate-400"><p className="text-4xl mb-3">📭</p><p>CV non généré.</p></div>
          }
        </div>
      )}

      {/* ══ TAB: Cover Letter ══ */}
      {tab === 'letter' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Lettre de motivation</span>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={saveLetter}
                disabled={letterSaving}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
              >{letterSaving ? '⏳ Sauvegarde…' : letterSaved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}</button>
              <button onClick={() => navigator.clipboard.writeText(letter)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium">📋 Copier</button>
              {app.letter_text && (<>
                <a href={`/api/letter/${app.id}`}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">⬇ PDF</a>
                <button
                  onClick={() => shareFile(`/api/letter/${app.id}`, `Lettre_${app.position}_${app.company}`, 'letter')}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-lg font-medium"
                >{copied === 'letter' ? '✅ Lien copié !' : '🔗 Partager'}</button>
              </>)}
            </div>
          </div>
          <textarea
            value={letter}
            onChange={e => setLetter(e.target.value)}
            className="w-full p-6 text-sm text-slate-800 leading-relaxed font-serif resize-y border-0 focus:outline-none focus:ring-0"
            style={{ minHeight: '60vh' }}
            placeholder="La lettre de motivation apparaîtra ici après génération…"
          />
        </div>
      )}

      {/* ══ TAB: Details ══ */}
      {tab === 'details' && (
        <div className="space-y-4">
          {analysis && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Analyse de l'offre</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                {[['Entreprise',analysis.company],['Lieu',analysis.location],['Contrat',analysis.contract_type],['Niveau',analysis.level]].map(([l,v])=>(
                  <div key={l}><p className="text-xs font-semibold text-slate-500 uppercase">{l}</p><p className="text-slate-900 mt-0.5">{v||'—'}</p></div>
                ))}
              </div>
              {analysis.required_skills?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Compétences requises</p>
                  <div className="flex flex-wrap gap-1.5">{analysis.required_skills.map((s:string)=><span key={s} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)}</div>
                </div>
              )}
              {analysis.ats_keywords?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Mots-clés ATS</p>
                  <div className="flex flex-wrap gap-1.5">{analysis.ats_keywords.map((k:string)=><span key={k} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">{k}</span>)}</div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Notes personnelles</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} placeholder="Contacts, préparation entretien…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
            <button onClick={saveNotes} className="mt-2 bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium">
              {noteSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>

          <div className="text-xs text-slate-400 text-right">
            Créé le {new Date(app.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900 mb-4 text-base border-b border-slate-100 pb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
    </div>
  );
}
