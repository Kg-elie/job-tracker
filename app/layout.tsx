import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Job Tracker – Kanga Elie',
  description: 'Suivi de candidatures avec génération CV & lettre IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50">
        {/* Navbar */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
            <Link href="/" className="font-bold text-brand-600 text-lg tracking-tight">
              🎯 Job Tracker
            </Link>
            {/* Nav links — scrollable horizontally on mobile */}
            <div className="flex gap-4 sm:gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
              <Link href="/"          className="hover:text-brand-600 transition-colors whitespace-nowrap">Dashboard</Link>
              <Link href="/search"    className="hover:text-brand-600 transition-colors whitespace-nowrap">🔍 Recherche</Link>
              <Link href="/new"       className="hover:text-brand-600 transition-colors whitespace-nowrap">+ Candidature</Link>
              <Link href="/profile"   className="hover:text-brand-600 transition-colors whitespace-nowrap">Profil</Link>
              <Link href="/templates" className="hover:text-brand-600 transition-colors whitespace-nowrap">Templates</Link>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
