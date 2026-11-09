# 🎯 Job Tracker – Kanga Elie

Site personnel de suivi manuel des candidatures.

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de dev
npm run dev
# → ouvre http://localhost:3000
```

## Fonctionnalités

- **Nouvelle candidature** : renseigne manuellement le lien de l'offre, puis ajoute les CV et lettre au format PDF, immédiatement ou plus tard
- **Tracker** : statuts Intéressé → En attente → Entretien → Refus / Accepté
- **Profil** : tes informations pré-remplies, modifiables à tout moment

La recherche et le scraping d'offres, l'analyse automatique, les générateurs et l'API Claude sont désactivés.

## Compilation PDF (optionnel)

Pour compiler le LaTeX en PDF, installe [MacTeX](https://www.tug.org/mactex/) :

```bash
brew install --cask mactex-no-gui
```

Sans MacTeX, le LaTeX est quand même généré et affiché dans l'interface — tu peux le copier sur [Overleaf](https://overleaf.com) pour compiler.

## Stack

- **Next.js 14** (App Router)
- **SQLite** via better-sqlite3 (base de données locale dans `data/`)
- **Tailwind CSS**
- **LaTeX** pour les documents déjà enregistrés
