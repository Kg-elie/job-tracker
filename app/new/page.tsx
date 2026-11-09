'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewApplication() {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [cvText, setCvText] = useState('');
  const [letter, setLetter] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createApplication() {
    if (!jobUrl.trim() || !/^https?:\/\/\S+$/i.test(jobUrl.trim())) {
      setError("Le lien de l'offre est obligatoire et doit être une URL valide.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          position: position.trim(),
          job_url: jobUrl.trim(),
          job_description: jobText.trim(),
          cv_latex: cvText.trim(),
          letter_text: letter.trim(),
          status: 'interested',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Impossible de créer la candidature.');
      router.push(`/applications/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer la candidature.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Nouvelle candidature</h1>
      <p className="text-slate-500 mb-8 text-sm">
        Ajoute une candidature manuellement. Le scraping, l&apos;analyse IA et la génération de documents sont désactivés.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          ⚠ {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Entreprise (facultatif)
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Nom de l'entreprise"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Poste (facultatif)
            <input
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Intitulé du poste"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Lien de l&apos;offre *
          <input
            value={jobUrl}
            onChange={e => setJobUrl(e.target.value)}
            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="https://..."
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Notes ou texte de l&apos;offre (facultatif)
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            rows={10}
            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-normal focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            placeholder="Colle manuellement les informations utiles..."
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          CV associé (facultatif)
          <textarea
            value={cvText}
            onChange={e => setCvText(e.target.value)}
            rows={8}
            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-normal focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            placeholder="Colle le contenu du CV ou indique le lien vers le fichier..."
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Lettre de motivation associée (facultatif)
          <textarea
            value={letter}
            onChange={e => setLetter(e.target.value)}
            rows={8}
            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            placeholder="Colle le contenu de la lettre ou indique le lien vers le fichier..."
          />
        </label>

        <button
          onClick={createApplication}
          disabled={saving}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la candidature'}
        </button>
      </div>
    </div>
  );
}
