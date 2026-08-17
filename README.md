# 🎯 Job Tracker – Kanga Elie

Site personnel de suivi de candidatures avec génération de CV et lettre de motivation via Claude AI.

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la clé API
cp .env.local.example .env.local
# → édite .env.local et mets ta clé ANTHROPIC_API_KEY

# 3. Lancer le serveur de dev
npm run dev
# → ouvre http://localhost:3000
```

## Fonctionnalités

- **Nouvelle candidature** : colle le texte de l'offre → Claude analyse → CV + lettre générés en ~30s
- **CV ATS-friendly** : template IIIT Vadodara en LaTeX, adapté et optimisé pour les mots-clés du poste
- **Lettre de motivation** : rédigée par Claude, adaptée à l'entreprise et au poste
- **Tracker** : statuts Intéressé → En attente → Entretien → Refus / Accepté
- **Profil** : tes informations pré-remplies, modifiables à tout moment

## Compilation PDF (optionnel)

Pour compiler le LaTeX en PDF, installe [MacTeX](https://www.tug.org/mactex/) :

```bash
brew install --cask mactex-no-gui
```

Sans MacTeX, le LaTeX est quand même généré et affiché dans l'interface — tu peux le copier sur [Overleaf](https://overleaf.com) pour compiler.

## Stack

- **Next.js 14** (App Router)
- **SQLite** via better-sqlite3 (base de données locale dans `data/`)
- **Claude API** (Anthropic) pour analyse offre + génération CV + lettre
- **Tailwind CSS**
- **LaTeX** template IIIT Vadodara (ATS-friendly)
