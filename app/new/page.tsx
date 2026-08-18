'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { JobAnalysis } from '@/lib/claude';
import type { Template } from '@/lib/db';

type Step = 'input' | 'scraping' | 'analyzing' | 'review' | 'generating' | 'done';

export default function NewApplication() {
  const router = useRouter();

  const [step, setStep]           = useState<Step>('input');
  const [jobText, setJobText]     = useState('');
  const [jobUrl, setJobUrl]       = useState('');
  const [analysis, setAnalysis]   = useState<JobAnalysis | null>(null);
  const [appId, setAppId]         = useState<number | null>(null);
  const [error, setError]         = useState('');
  const [scrapeWarn, setScrapeWarn] = useState('');
  const [pdfPath, setPdfPath]     = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => {}); // templates are optional, don't block the page
  }, []);

  async function handleScrape() {
    if (!jobUrl.trim().startsWith('http')) {
      setError('Entrez une URL valide (http…)');
      return;
    }
    setError('');
    setScrapeWarn('');
    setStep('scraping');
    try {
      const res  = await fetch('/api/scrape-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setJobText(data.text);
        setScrapeWarn('');
      } else {
        setScrapeWarn(data.error ?? 'Scraping échoué — colle le texte manuellement ci-dessous.');
        if (data.partial) setJobText(data.partial);
      }
    } catch {
      setScrapeWarn('Impossible d\'accéder à la page. Colle le texte manuellement.');
    }
    setStep('input');
  }

  async function handleAnalyze() {
    if (!jobText.trim()) { setError('Colle le texte de l\'offre ou scrape depuis l\'URL'); return; }
    setError('');
    setStep('analyzing');
    try {
      const res = await fetch('/api/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
      setStep('review');
    } catch (e) {
      setError(String(e));
      setStep('input');
    }
  }

  async function handleGenerate() {
    if (!analysis) return;
    setStep('generating');
    setError('');
    try {
      const createRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company:         analysis.company,
          position:        analysis.position,
          job_url:         jobUrl,
          job_description: jobText,
          status:          'interested',
          template_id:     templateId,
        }),
      });
      const { id } = await createRes.json();
      setAppId(id);

      // Étape 1 : génération AI (CV JSON + lettre) — ~20-25s avec Sonnet
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, analysis, templateId }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error);

      setStep('done');

      // Étape 2 : compilation PDF séparée — ~10-15s (fire & check)
      fetch('/api/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id }),
      }).then(async r => {
        if (r.ok) {
          const d = await r.json();
          if (d.pdfPath) setPdfPath(d.pdfPath);
        }
      }).catch(() => {});
    } catch (e) {
      setError(String(e));
      setStep('review');
    }
  }

  const STEPS: Step[] = ['input','scraping','analyzing','review','generating','done'];
  const LABELS        = ['Offre','Scraping','Analyse','Vérif.','Génération','Terminé'];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Nouvelle candidature</h1>
      <p className="text-slate-500 mb-8 text-sm">Lien ou texte de l'offre → Claude analyse → CV + lettre en 30 s.</p>

      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-8 text-xs font-medium flex-wrap">
        {STEPS.map((s, i) => {
          const active = step === s;
          const past   = STEPS.indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-1.5">
              {i > 0 && <div className={`h-px w-6 ${past ? 'bg-brand-500' : 'bg-slate-200'}`} />}
              <div className={`px-2.5 py-1 rounded-full transition-all ${
                active ? 'bg-brand-600 text-white' : past ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {past && !active ? '✓ ' : ''}{LABELS[i]}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">⚠ {error}</div>
      )}

      {/* STEP: Input */}
      {(step === 'input' || step === 'scraping' || step === 'analyzing') && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">

          {/* URL + scrape button */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              🔗 Lien de l'offre
            </label>
            <div className="flex gap-2">
              <input
                value={jobUrl}
                onChange={e => setJobUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
                placeholder="https://welcometothejungle.com/… ou linkedin.com/jobs/…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                onClick={handleScrape}
                disabled={step === 'scraping'}
                className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {step === 'scraping' ? <span className="animate-spin inline-block">⟳</span> : '⬇ Importer'}
              </button>
            </div>
            {scrapeWarn && (
              <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-xs">
                ⚠ {scrapeWarn} <span className="font-semibold">↓ Colle le texte dans le champ ci-dessous.</span>
              </div>
            )}
          </div>

          {/* Text fallback */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              📋 Texte de l'offre
              {scrapeWarn
                ? <span className="ml-2 text-amber-600 font-semibold animate-pulse">← Colle le texte ici</span>
                : <span className="text-slate-400 font-normal"> (ou colle ici si le lien ne marche pas)</span>
              }
            </label>
            <textarea
              value={jobText}
              onChange={e => setJobText(e.target.value)}
              placeholder="Colle ici le texte complet de l'offre (Ctrl+A → Ctrl+C depuis la page de l'offre)…"
              rows={10}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 resize-none transition-all ${
                scrapeWarn
                  ? 'border-amber-400 ring-2 ring-amber-200 focus:ring-amber-400'
                  : 'border-slate-200 focus:ring-brand-400'
              }`}
            />
            {jobText && (
              <p className="text-xs text-slate-400 mt-1">{jobText.length.toLocaleString()} caractères</p>
            )}
          </div>

          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">🎨 Template CV</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTemplateId(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    templateId === null ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  IIIT Vadodara (défaut)
                </button>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      templateId === t.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={step === 'analyzing' || step === 'scraping' || !jobText.trim()}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {step === 'analyzing' ? <><span className="animate-spin">⟳</span> Analyse en cours…</> : '🔍 Analyser l\'offre'}
          </button>
        </div>
      )}

      {/* STEP: Review */}
      {(step === 'review' || step === 'generating') && analysis && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📋 Analyse de l'offre</h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              {[['Entreprise', analysis.company],['Poste', analysis.position],
                ['Lieu', analysis.location],['Contrat', analysis.contract_type],
                ['Niveau', analysis.level],['Langue', analysis.language === 'fr' ? '🇫🇷 Français' : '🇬🇧 English']
              ].map(([l, v]) => (
                <div key={l}><p className="text-xs font-semibold text-slate-500 uppercase">{l}</p>
                <p className="text-slate-900 font-medium mt-0.5">{v || '—'}</p></div>
              ))}
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Compétences requises</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.required_skills.map(s => <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Mots-clés ATS</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.ats_keywords.map(k => <span key={k} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">{k}</span>)}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={step === 'generating'}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {step === 'generating' ? <><span className="animate-spin inline-block">⟳</span> Génération CV + lettre (30–60s)…</> : '✨ Générer CV & Lettre'}
          </button>
          <button onClick={() => setStep('input')} className="w-full text-slate-500 text-sm py-2">← Modifier</button>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && appId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">CV & Lettre générés !</h2>
          <p className="text-slate-500 text-sm mb-6">
            {pdfPath ? 'PDF compilé avec succès.' : 'LaTeX prêt — installe MacTeX pour compiler en PDF, ou copie sur Overleaf.'}
          </p>
          <div className="flex gap-3 justify-center">
            <a href={`/applications/${appId}`} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium">
              Voir & éditer →
            </a>
            <button onClick={() => { setStep('input'); setJobText(''); setJobUrl(''); setAnalysis(null); setScrapeWarn(''); }}
              className="border border-slate-200 hover:border-slate-300 text-slate-600 px-6 py-2 rounded-lg font-medium">
              Nouvelle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
