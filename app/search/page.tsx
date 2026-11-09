import Link from 'next/link';

export default function SearchPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Recherche d&apos;offres désactivée</h1>
        <p className="text-slate-500 text-sm mt-3">
          La recherche automatique et le scraping ne sont plus disponibles.
        </p>
        <Link href="/new" className="inline-block mt-6 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
          Ajouter une candidature manuellement
        </Link>
      </div>
    </div>
  );
}
