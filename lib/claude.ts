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
// Claude génère UNIQUEMENT ce qui change (summary + bullets + skills + projets sélectionnés)
// puis on merge avec le profil original en TypeScript → output ~600 tokens au lieu de 2500
interface CVTailoring {
  summary: string;
  experience_bullets: string[][];      // un tableau de bullets par expérience
  skills: Record<string, string[]>;
  selected_projects: string[];         // noms des projets à conserver
  extra_skill_categories?: Record<string, string[]>; // catégories supplémentaires si stack manquante
}

export async function generateCV(profile: Profile, analysis: JobAnalysis): Promise<Profile> {
  const expSummary = profile.experience.map((e, i) =>
    `[${i}] ${e.company} – ${e.role} (${e.start}–${e.end}): ${e.bullets.slice(0,2).join(' | ')}`
  ).join('\n');

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Tu es expert CV ATS. Génère UNIQUEMENT le JSON suivant, sans markdown:
{
  "summary": "accroche 2-3 phrases ciblée sur le poste",
  "experience_bullets": [["bullet1","bullet2","bullet3","bullet4"]],
  "skills": {"Catégorie": ["outil1","outil2"]},
  "selected_projects": ["NomProjet1","NomProjet2","NomProjet3"]
}

POSTE: ${analysis.position} chez ${analysis.company}
LANGUE: ${analysis.language === 'en' ? 'ANGLAIS' : 'FRANÇAIS'}
MOTS-CLÉS ATS: ${analysis.ats_keywords.join(', ')}
COMPÉTENCES REQUISES: ${analysis.required_skills.join(', ')}
COMPÉTENCES PRÉFÉRÉES: ${analysis.preferred_skills.join(', ')}

EXPÉRIENCES ACTUELLES:
${expSummary}

COMPÉTENCES ACTUELLES: ${JSON.stringify(profile.skills)}
PROJETS DISPONIBLES: ${profile.projects.map(p => p.name).join(', ')}

RÈGLES:
1. Réécris les bullets avec verbes d'action + résultats quantifiés + mots-clés ATS
2. experience_bullets[i] = tableau de bullets pour expérience i (même ordre que ci-dessus)
3. skills = compétences réordonnées, les plus pertinentes en premier
4. Si une required_skill manque dans les skills actuelles, ajoute-la dans la catégorie appropriée
5. selected_projects: 3-4 projets les plus pertinents parmi ceux disponibles
6. summary: mentionne l'entreprise ${analysis.company} et le poste ${analysis.position}`
    }]
  });

  const tailoring = parseJSON<CVTailoring>(extractText(msg));

  // Merge avec le profil original — on ne retouche que ce que Claude a changé
  return {
    ...profile,
    summary: tailoring.summary,
    experience: profile.experience.map((exp, i) => ({
      ...exp,
      bullets: tailoring.experience_bullets[i] ?? exp.bullets,
    })),
    skills: tailoring.skills,
    projects: profile.projects
      .filter(p => tailoring.selected_projects.includes(p.name))
      .slice(0, 4),
  };
}

// ── Cover Letter Generation ──────────────────────────────────────────────────
export async function generateCoverLetter(profile: Profile, analysis: JobAnalysis): Promise<string> {
  const lang = analysis.language === 'en' ? 'anglais' : 'français';
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
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
- Date: ${new Date().toLocaleDateString(analysis.language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
- Destinataire: Service Recrutement, ${analysis.company}
- Objet: Candidature au poste de ${analysis.position}
- Corps: 3 paragraphes impactants (accroche + valeur ajoutée + conclusion avec call-to-action)
- Formule de politesse professionnelle (ex: "Cordialement,")

Règles ABSOLUES:
- NE PAS inclure les coordonnées (nom, email, téléphone, adresse) — elles sont déjà dans l'en-tête du document
- NE PAS signer avec le nom à la fin — terminer uniquement par la formule de politesse
- Maximum 350 mots dans le corps
- Intègre naturellement les mots-clés: ${analysis.ats_keywords.slice(0,5).join(', ')}
- Ton professionnel et confiant, jamais arrogant
- Cite des réalisations concrètes et chiffrées quand possible

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
