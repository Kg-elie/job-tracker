'use client';

import { useEffect, useState } from 'react';
import type { Profile, Experience, Education, Project, Certification } from '@/lib/db';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(setProfile);
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) return <div className="text-center py-20 text-slate-400 animate-pulse">Chargement…</div>;

  function updateField<K extends keyof Profile>(k: K, v: Profile[K]) {
    setProfile(prev => prev ? { ...prev, [k]: v } : null);
  }

  // ─── Experience helpers ────────────────────────────────────────────────────
  function updateExp(i: number, field: keyof Experience, val: string | string[]) {
    const updated = [...profile!.experience];
    updated[i] = { ...updated[i], [field]: val };
    updateField('experience', updated);
  }
  function addExp() {
    updateField('experience', [...profile!.experience, { company:'', role:'', location:'', start:'', end:'', bullets:[''] }]);
  }
  function removeExp(i: number) {
    updateField('experience', profile!.experience.filter((_,j) => j !== i));
  }

  // ─── Education helpers ─────────────────────────────────────────────────────
  function updateEdu(i: number, field: keyof Education, val: string | string[]) {
    const updated = [...profile!.education];
    updated[i] = { ...updated[i], [field]: val };
    updateField('education', updated);
  }
  function addEdu() {
    updateField('education', [...profile!.education, { school:'', degree:'', location:'', start:'', end:'', highlights:[] }]);
  }

  // ─── Skills helpers ────────────────────────────────────────────────────────
  function updateSkillCat(oldCat: string, newCat: string) {
    const s = { ...profile!.skills };
    const val = s[oldCat];
    delete s[oldCat];
    s[newCat] = val;
    updateField('skills', s);
  }
  function updateSkillItems(cat: string, val: string) {
    updateField('skills', { ...profile!.skills, [cat]: val.split(',').map(s => s.trim()).filter(Boolean) });
  }
  function addSkillCat() {
    updateField('skills', { ...profile!.skills, 'Nouvelle catégorie': [] });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 text-sm">Ces informations seront utilisées pour générer tes CV et lettres.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      {/* ── Info de base ── */}
      <Section title="Informations personnelles">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom complet"      value={profile.name}         onChange={v => updateField('name', v)} />
          <Field label="Email"            value={profile.email}        onChange={v => updateField('email', v)} />
          <Field label="Téléphone"        value={profile.phone}        onChange={v => updateField('phone', v)} />
          <Field label="Localisation"     value={profile.location}     onChange={v => updateField('location', v)} />
          <Field label="GitHub"           value={profile.github}       onChange={v => updateField('github', v)} />
          <Field label="LinkedIn"         value={profile.linkedin}     onChange={v => updateField('linkedin', v)} />
          <Field label="Disponibilité"    value={profile.availability} onChange={v => updateField('availability', v)} />
        </div>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Résumé / Accroche</label>
          <textarea
            value={profile.summary}
            onChange={e => updateField('summary', e.target.value)}
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
          />
        </div>
      </Section>

      {/* ── Expérience ── */}
      <Section title="Expérience professionnelle">
        {profile.experience.map((exp, i) => (
          <div key={i} className="border border-slate-100 rounded-lg p-4 mb-3 bg-slate-50">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Entreprise" value={exp.company}  onChange={v => updateExp(i,'company',v)} />
              <Field label="Rôle"       value={exp.role}     onChange={v => updateExp(i,'role',v)} />
              <Field label="Lieu"       value={exp.location} onChange={v => updateExp(i,'location',v)} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Début" value={exp.start} onChange={v => updateExp(i,'start',v)} />
                <Field label="Fin"   value={exp.end}   onChange={v => updateExp(i,'end',v)} />
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Bullets (un par ligne)</label>
            <textarea
              value={exp.bullets.join('\n')}
              onChange={e => updateExp(i, 'bullets', e.target.value.split('\n'))}
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
            <button onClick={() => removeExp(i)} className="mt-2 text-red-400 hover:text-red-600 text-xs">Supprimer</button>
          </div>
        ))}
        <button onClick={addExp} className="text-brand-600 hover:text-brand-800 text-sm font-medium">+ Ajouter expérience</button>
      </Section>

      {/* ── Formation ── */}
      <Section title="Formation">
        {profile.education.map((ed, i) => (
          <div key={i} className="border border-slate-100 rounded-lg p-4 mb-3 bg-slate-50">
            <div className="grid grid-cols-2 gap-3">
              <Field label="École"   value={ed.school}   onChange={v => updateEdu(i,'school',v)} />
              <Field label="Diplôme" value={ed.degree}   onChange={v => updateEdu(i,'degree',v)} />
              <Field label="Lieu"    value={ed.location} onChange={v => updateEdu(i,'location',v)} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Début" value={ed.start} onChange={v => updateEdu(i,'start',v)} />
                <Field label="Fin"   value={ed.end}   onChange={v => updateEdu(i,'end',v)} />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addEdu} className="text-brand-600 hover:text-brand-800 text-sm font-medium">+ Ajouter formation</button>
      </Section>

      {/* ── Compétences ── */}
      <Section title="Compétences techniques">
        {Object.entries(profile.skills).map(([cat, items]) => (
          <div key={cat} className="mb-3">
            <div className="flex gap-2 mb-1">
              <input
                value={cat}
                onChange={e => updateSkillCat(cat, e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs font-semibold w-40"
              />
            </div>
            <input
              value={items.join(', ')}
              onChange={e => updateSkillItems(cat, e.target.value)}
              placeholder="Outil1, Outil2, Outil3"
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        ))}
        <button onClick={addSkillCat} className="text-brand-600 hover:text-brand-800 text-sm font-medium">+ Ajouter catégorie</button>
      </Section>

      <div className="pb-12" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
      <h2 className="font-semibold text-slate-900 mb-4 text-base border-b border-slate-100 pb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
    </div>
  );
}
