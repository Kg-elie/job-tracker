'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/app/api/job-search/route';

const CONTRACT_OPTIONS = [
  { value: '',           label: 'Tous' },
  { value: 'permanent', label: 'CDI' },
  { value: 'contract',  label: 'CDD / Alternance' },
  { value: 'part_time', label: 'Stage' },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-100 text-green-700 border-green-200' :
    score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {score}/100
    </span>
  );
}

export default function SearchPage() {
  const router = useRouter();

  const [keywords, setKeywords] = useState('Data Analyst');
  const [location, setLocation] = useState('Paris');
  const [contract, setContract] = useState('');
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [adding,   setAdding]   = useState<string | null>(null); // job id en cours d'ajout

  async function search() {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const params = new URLSearchParams({ q: keywords, where: location });
      if (contract) params.set('contract', contract);
      const res  = await fetch(`/api/job-search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur de recherche');
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  async function addToTracker(job: SearchResult) {
    setAdding(job.id);
    try {
      // Créer l'application avec l'URL de l'offre
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company:         job.company,
          position:        job.title,
          job_url:         job.url,
          job_description: job.description,
          status:          'interested',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur création');
      router.push(`/applications/${data.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur');
      setAdding(null);
    }
  }

  const daysAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    return d === 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d}j`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🔍 Recherche d'offres</h1>
        <p className="text-slate-500 text-sm mt-1">
          Offres classées par pertinence pour ton profil via Claude
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Mots-clés (ex: Data Analyst, Python…)"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <input
            className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Lieu"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1">
            {CONTRACT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setContract(opt.value)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  contract === opt.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-slate-200 text-slate-600 hover:border-brand-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={search}
            disabled={loading}
            className="ml-auto px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error.includes('ADZUNA') ? (
            <>
              <p className="font-semibold mb-1">Clés API Adzuna manquantes</p>
              <p>1. Crée un compte gratuit sur <a href="https://developer.adzuna.com" target="_blank" className="underline">developer.adzuna.com</a></p>
              <p>2. Copie ton <code>app_id</code> et <code>app_key</code></p>
              <p>3. Ajoute-les dans Vercel → Settings → Environment Variables :</p>
              <p className="mt-1 font-mono text-xs bg-red-100 px-2 py-1 rounded">ADZUNA_APP_ID=xxx<br/>ADZUNA_APP_KEY=yyy</p>
            </>
          ) : error}
        </div>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {total.toLocaleString()} offres trouvées · top {results.length} classées par pertinence
          </p>
          {results.map(job => (
            <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-800 text-sm">{job.title}</h2>
                    <ScoreBadge score={job.score} />
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {job.company} · {job.location}
                    {job.salary && <span className="text-green-700 font-medium"> · {job.salary}</span>}
                    {job.contract && <span className="text-slate-400"> · {job.contract}</span>}
                    <span className="text-slate-400"> · {daysAgo(job.created)}</span>
                  </p>
                  {job.reason && (
                    <p className="text-xs text-brand-600 mt-1 italic">✦ {job.reason}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{job.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:border-slate-400 transition-colors"
                >
                  ↗ Voir l'offre
                </a>
                <button
                  onClick={() => addToTracker(job)}
                  disabled={adding === job.id}
                  className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {adding === job.id ? 'Ajout…' : '+ Ajouter au tracker'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Lance une recherche pour voir les offres
        </div>
      )}
    </div>
  );
}
