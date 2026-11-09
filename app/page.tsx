'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Application } from '@/lib/db';

const STATUS_CONFIG = {
  interested: { label: 'Intéressé',  color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  pending:    { label: 'En attente', color: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-500' },
  interview:  { label: 'Entretien',  color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
  rejected:   { label: 'Refus',      color: 'bg-red-100 text-red-700',      dot: 'bg-red-500'    },
  accepted:   { label: 'Accepté',    color: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
} as const;

const STATUS_ORDER = ['interested', 'pending', 'interview', 'rejected', 'accepted'] as const;
type Status = keyof typeof STATUS_CONFIG;

export default function Dashboard() {
  const [apps, setApps]       = useState<Application[]>([]);
  const [filter, setFilter]   = useState<Status | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/applications')
      .then(r => r.json())
      .then(data => { setApps(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<Status, number>);

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);

  async function updateStatus(id: number, status: Status) {
    await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteApp(id: number) {
    if (!confirm('Supprimer cette candidature ?')) return;
    await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    setApps(prev => prev.filter(a => a.id !== id));
  }

  if (loading) return <div className="text-center py-20 text-slate-400 animate-pulse">Chargement…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mes candidatures</h1>
          <p className="text-slate-500 text-sm mt-1">{apps.length} candidature{apps.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/new" className="bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
          + Nouvelle
        </Link>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
        {STATUS_ORDER.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => setFilter(prev => prev === s ? 'all' : s)}
              className={`rounded-xl p-3 sm:p-4 text-left transition-all border-2 bg-white shadow-sm hover:shadow ${filter === s ? 'border-brand-500 shadow-md' : 'border-transparent'}`}>
              <div className="text-xl sm:text-2xl font-bold">{counts[s]}</div>
              <div className="text-xs font-medium mt-1 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
                <span className="truncate">{cfg.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-medium">Aucune candidature{filter !== 'all' ? ` "${STATUS_CONFIG[filter as Status]?.label}"` : ''}</p>
          <Link href="/new" className="mt-4 inline-block text-brand-600 hover:underline text-sm">Ajouter la première →</Link>
        </div>
      ) : (
        <>
          <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Entreprise</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Poste</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Docs</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(app => {
                  const cfg = STATUS_CONFIG[app.status as Status] ?? STATUS_CONFIG.interested;
                  return (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{app.company}</td>
                      <td className="px-4 py-3 text-slate-700">{app.position}</td>
                      <td className="px-4 py-3">
                        <select value={app.status} onChange={e => updateStatus(app.id, e.target.value as Status)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${cfg.color}`}>
                          {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(app.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${app.cv_latex ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>CV</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${app.letter_text ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>LM</span>
                          {app.cv_pdf_path && <span className="text-xs px-2 py-0.5 rounded bg-brand-100 text-brand-700">PDF</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/applications/${app.id}`} className="text-brand-600 hover:text-brand-800 font-medium text-xs">Voir →</Link>
                          <button onClick={() => deleteApp(app.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-3">
            {filtered.map(app => {
              const cfg = STATUS_CONFIG[app.status as Status] ?? STATUS_CONFIG.interested;
              return (
                <div key={app.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{app.company}</p>
                      <p className="text-sm text-slate-600 truncate">{app.position}</p>
                    </div>
                    <select value={app.status} onChange={e => updateStatus(app.id, e.target.value as Status)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer flex-shrink-0 ${cfg.color}`}>
                      {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${app.cv_latex ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>CV</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${app.letter_text ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>LM</span>
                      {app.cv_pdf_path && <span className="text-xs px-2 py-0.5 rounded bg-brand-100 text-brand-700">PDF</span>}
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/applications/${app.id}`} className="text-brand-600 font-medium text-sm">Voir →</Link>
                      <button onClick={() => deleteApp(app.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
