import Anthropic from '@anthropic-ai/sdk';
import type { Profile } from './db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = process.env.CLAUDE_MODEL ?? 'claude-sonnet-5';

/**
 * Find the first text block in a Claude response.
 * Newer models (Sonnet 5, Opus 5…) may return a 'thinking' block before the text.
 */
function extractText(msg: Anthropic.Message): string {
  for (const block of msg.content) {
    if (block.type === 'text') return block.text;
  }
  throw new Error(`Aucun bloc texte dans la réponse Claude (types reçus: ${msg.content.map(b => b.type).join(', ')})`);
}

/** Strip markdown code fences if Claude wraps JSON anyway */
function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json|javascript|js)?\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

// ── Job Analysis ─────────────────────────────────────────────────────────────
export interface JobAnalysis {
  company: string;
  position: string;
  location: string;
  contract_type: string;
  language: 'fr' | 'en';
  level: string;
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  ats_keywords: string[];
  company_description: string;
}

export async function analyzeJob(jobText: string): Promise<JobAnalysis> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Tu es un expert en analyse d'offres d'emploi.
Analyse cette offre et renvoie UNIQUEMENT un JSON valide (sans markdown) avec cette structure exacte:
{
  "company": "nom de l'entreprise",
  "position": "intitulé du poste",
  "location": "ville/pays",
  "contract_type": "CDI|CDD|Stage|Alternance|Freelance",
  "language": "fr|en",
  "level": "Junior|Mid|Senior",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "responsibilities": ["resp1", "resp2"],
  "ats_keywords": ["mot-clé ATS 1", "mot-clé ATS 2"],
  "company_description": "courte description de l'entreprise"
}

OFFRE D'EMPLOI:
${jobText}`
    }]
  });

  return parseJSON<JobAnalysis>(extractText(msg));
}

// ── CV Generation ────────────────────────────────────────────────────────────
export async function generateCV(profile: Profile, analysis: JobAnalysis): Promise<Profile> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Tu es un expert en rédaction de CV ATS-optimisés pour le marché français.

PROFIL DU CANDIDAT (JSON):
${JSON.stringify(profile, null, 2)}

ANALYSE DE L'OFFRE:
${JSON.stringify(analysis, null, 2)}

Ta mission: génère une version TAILORED du profil, optimisée pour ce poste.
Règles STRICTES:
1. Réécris les bullets d'expérience avec des verbes d'action et des résultats quantifiés, en intégrant les mots-clés ATS: ${analysis.ats_keywords.join(', ')}
2. Mets en avant les compétences techniques qui matchent les required_skills et preferred_skills
3. Réordonne les compétences: les plus pertinentes en premier
4. Adapte le résumé pour coller exactement au poste et à l'entreprise
5. Sélectionne les 3-4 projets les plus pertinents pour ce poste
6. ${analysis.language === 'en' ? 'Rédige en ANGLAIS' : 'Rédige en FRANÇAIS'}
7. Garde EXACTEMENT la même structure JSON que le profil d'entrée
8. STACK MANQUANTE — RÈGLE ABSOLUE : si une compétence ou technologie listée dans required_skills ou preferred_skills n'est pas dans le profil, tu DOIS l'ajouter. Deux façons selon le contexte :
   a) Si c'est un outil proche de ce que le candidat utilise déjà : intègre-le naturellement dans un bullet d'expérience existant (ex: "...en utilisant \\textbf{OutilManquant} et \\textbf{OutilConnu}...")
   b) Sinon : ajoute-le dans la section skills dans la catégorie la plus pertinente
   L'objectif est un matching ATS de 100%. Ne laisse AUCUNE compétence requise absente du profil final.

Renvoie UNIQUEMENT le JSON du profil tailorisé, sans markdown ni explication.`
    }]
  });

  return parseJSON<Profile>(extractText(msg));
}

// ── Cover Letter Generation ──────────────────────────────────────────────────
export async function generateCoverLetter(profile: Profile, analysis: JobAnalysis): Promise<string> {
  const lang = analysis.language === 'en' ? 'anglais' : 'français';
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Tu es expert en rédaction de lettres de motivation percutantes pour le marché ${lang === 'français' ? 'français' : 'anglophone'}.

PROFIL:
${JSON.stringify({ name: profile.name, summary: profile.summary, experience: profile.experience, skills: profile.skills, education: profile.education }, null, 2)}

OFFRE:
- Entreprise: ${analysis.company}
- Poste: ${analysis.position}
- Description entreprise: ${analysis.company_description}
- Compétences requises: ${analysis.required_skills.join(', ')}
- Responsabilités clés: ${analysis.responsibilities.slice(0,3).join(' | ')}

Rédige une lettre de motivation en ${lang} avec:
- En-tête: ${profile.name} | ${profile.phone} | ${profile.email} | ${profile.location}
- Date: ${new Date().toLocaleDateString(analysis.language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
- Destinataire: Service Recrutement, ${analysis.company}
- Objet: Candidature au poste de ${analysis.position}
- Corps: 3 paragraphes impactants (accroche + valeur ajoutée + conclusion avec call-to-action)
- Formule de politesse professionnelle
- Signature

Règles:
- Maximum 350 mots dans le corps
- Intègre naturellement les mots-clés: ${analysis.ats_keywords.slice(0,5).join(', ')}
- Ton professionnel et confiant, jamais arrogant
- Cite des réalisations concrètes et chiffrées quand possible
- Termine par une phrase mémorable

Renvoie le texte brut formaté, prêt à copier-coller.`
    }]
  });

  return extractText(msg);
}

// ── Fill a custom LaTeX template with profile data ───────────────────────────
export async function fillTemplate(profile: Profile, analysis: JobAnalysis, templateLatex: string): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Tu es expert en LaTeX et en rédaction de CV ATS-optimisés.

Voici un template LaTeX de CV :
\`\`\`latex
${templateLatex}
\`\`\`

Voici le profil du candidat (JSON) :
${JSON.stringify(profile, null, 2)}

Voici l'analyse du poste ciblé :
${JSON.stringify(analysis, null, 2)}

Ta mission :
1. Remplis le template LaTeX avec les informations du candidat, adaptées et optimisées pour ce poste
2. Intègre les mots-clés ATS : ${analysis.ats_keywords.join(', ')}
3. ${analysis.language === 'en' ? 'Rédige le contenu en ANGLAIS' : 'Rédige le contenu en FRANÇAIS'}
4. Ne modifie PAS la structure LaTeX, les commandes, ni le style
5. Ne JAMAIS inventer des expériences inexistantes

Renvoie UNIQUEMENT le fichier LaTeX complet et compilable, sans markdown ni explication.`
    }]
  });

  return extractText(msg).replace(/^```latex\n?/, '').replace(/\n?```$/, '').trim();
}
