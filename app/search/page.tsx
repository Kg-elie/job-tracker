'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/app/api/job-search/route';

const CONTRACT_OPTIONS = [
  { value: '',           label: 'Tous contrats' },
  { value: 'permanent', label: 'CDI' },
  { value: 'contract',  label: 'CDD' },
  { value: 'part_time', label: 'Stage / Alternance' },
];

const DATE_OPTIONS = [
  { value: 'all',   label: 'Toutes dates' },
  { value: 'today', label: 'Aujourd\'hui' },
  { value: '3days', label: '3 derniers jours' },
  { value: 'week',  label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Pertinence' },
  { value: 'date',  label: 'Date' },
  { value: 'salary','label': 'Salaire' },
];

const SCORE_OPTIONS = [
  { value: 0,  label: 'Tous scores' },
  { value: 50, label: '50+' },
  { value: 65, label: '65+' },
  { value: 75, label: '75+' },
  { value: 90, label: '90+' },
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

function FilterChips<T extends string | number>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => (
        <button key={String(opt.value)} onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            value === opt.value
              ? 'bg-brand-600 text-white border-brand-600'
              : 'border-slate-200 text-slate-600 hover:border-brand-400'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
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
  const [adding,   setAdding]   = useState<string | null>(null);

  // Filtres + tri locaux
  const [minScore, setMinScore] = useState(0);
  const [datePost, setDatePost] = useState('all');   // envoyé à l'API
  const [sortBy,   setSortBy]   = useState<'score' | 'date' | 'salary'>('score');

  async function search() {
    setLoading(true); setError(''); setResults([]);
    try {
      const params = new URLSearchParams({ q: keywords, where: location });
      if (contract) params.set('contract', contract);
      if (datePost !== 'all') params.set('date', datePost);
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

  // Filtrage + tri client
  const filtered = useMemo(() => {
    const list = results.filter(job => {
      if (minScore > 0 && job.score < minScore) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'score')  return b.score - a.score;
      if (sortBy === 'date')   return new Date(b.created).getTime() - new Date(a.created).getTime();
      if (sortBy === 'salary') {
        const sa = parseSalary(a.salary);
        const sb = parseSalary(b.salary);
        return sb - sa;
      }
      return 0;
    });
  }, [results, minScore, maxDays, sortBy]);

  function parseSalary(s?: string): number {
    if (!s) return 0;
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }

  async function addToTracker(job: SearchResult) {
    setAdding(job.id);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: job.company, position: job.title, job_url: job.url, job_description: job.description, status: 'interested' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur création');
      router.push(`/applications/${data.id}`);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); setAdding(null); }
  }

  const daysAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d}j`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🔍 Recherche d'offres</h1>
        <p className="text-slate-500 text-sm mt-1">Offres classées par pertinence pour ton profil via Claude</p>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {/* Mots-clés + lieu */}
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

        {/* Contrat */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium w-14">Contrat</span>
          <FilterChips options={CONTRACT_OPTIONS} value={contract} onChange={setContract} />
        </div>

        {/* Bouton */}
        <div className="flex justify-end">
          <button onClick={search} disabled={loading}
            className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
      </div>

      {/* Filtres post-résultats */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium w-14">Score min</span>
            <FilterChips options={SCORE_OPTIONS} value={minScore} onChange={setMinScore} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium w-14">Date</span>
            <FilterChips options={DATE_OPTIONS} value={datePost} onChange={v => { setDatePost(String(v)); }} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium w-14">Trier par</span>
            <FilterChips options={SORT_OPTIONS} value={sortBy} onChange={v => setSortBy(v as typeof sortBy)} />
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error.includes('ADZUNA') ? (
            <>
              <p className="font-semibold mb-1">Clés API Adzuna manquantes</p>
              <p>1. Crée un compte gratuit sur <a href="https://developer.adzuna.com" target="_blank" className="underline">developer.adzuna.com</a></p>
              <p>2. Ajoute dans Vercel → Settings → Environment Variables :</p>
              <p className="mt-1 font-mono text-xs bg-red-100 px-2 py-1 rounded">ADZUNA_APP_ID=xxx<br/>ADZUNA_APP_KEY=yyy</p>
            </>
          ) : error}
        </div>
      )}

      {/* Résultats */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {filtered.length} offre{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
            {results.length !== filtered.length && ` (${results.length} au total)`}
            {total > results.length && ` · ${total.toLocaleString()} dans Adzuna`}
          </p>
          {filtered.map(job => (
            <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-semibold text-slate-800 text-sm">{job.title}</h2>
                <ScoreBadge score={job.score} />
              </div>
              <p className="text-sm text-slate-600">
                {job.company} · {job.location}
                {job.salary && <span className="text-green-700 font-medium"> · {job.salary}</span>}
                {job.contract && <span className="text-slate-400"> · {job.contract}</span>}
                <span className="text-slate-400"> · {daysAgo(job.created)}</span>
              </p>
              {job.source && <span className="text-xs text-slate-400 mr-2">via {job.source}</span>}
              {job.reason && <p className="text-xs text-brand-600 mt-1 italic">✦ {job.reason}</p>}
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{job.description}</p>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:border-slate-400 transition-colors">
                  ↗ Voir l'offre
                </a>
                <button onClick={() => addToTracker(job)} disabled={adding === job.id}
                  className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {adding === job.id ? 'Ajout…' : '+ Ajouter au tracker'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Résultats filtrés vides */}
      {results.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          Aucun résultat avec ces filtres — essaie de les élargir
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
