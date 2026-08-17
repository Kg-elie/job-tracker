import type { Profile } from './db';
import { execSync } from 'child_process';
import fs   from 'fs';
import path from 'path';
import os   from 'os';

// ── Outils à mettre en gras automatiquement dans les bullets ─────────────────
const TOOL_PATTERNS = [
  // BI & Data
  'Power BI','Tableau','Tableau Prep','Tableau Desktop','Tableau Server',
  'Dataiku','Looker','Metabase','Qlik','MicroStrategy','SSRS',
  // Bases de données
  'Oracle','SQL Server','PostgreSQL','MySQL','MongoDB','Snowflake',
  'Teradata','Hadoop','Hive','Spark','Databricks','BigQuery','Redshift',
  'SQLite','Cassandra','Redis','Elasticsearch',
  // Langages
  'Python','R','SQL','Java','Scala','Julia','Rust','Go','TypeScript',
  'JavaScript','C\\+\\+','C#','.NET',
  // Cloud & DevOps
  'AWS','Azure','GCP','Docker','Kubernetes','Airflow','dbt','MLflow',
  'Git','GitHub','GitLab','Terraform','Jenkins','CI/CD',
  // ML & Data Science
  'scikit-learn','TensorFlow','PyTorch','Keras','XGBoost','LightGBM',
  'Pandas','NumPy','Matplotlib','Seaborn','Plotly','NLTK','spaCy',
  'LangChain','RAG','Hugging Face','OpenAI','Anthropic',
  // IBM & ERP
  'IBM Studio','IBM Cognos','SAP','Salesforce','ServiceNow',
  // Autres
  'Excel','VBA','Power Query','Power Automate','SharePoint','Jira','Confluence',
];

/** Entoure les noms d'outils connus de \\textbf{} dans un texte brut */
function boldTools(text: string): string {
  let result = text;
  for (const tool of TOOL_PATTERNS) {
    // Échappe les caractères regex sauf ceux déjà échappés (C\+\+)
    const safePattern = tool.replace(/(?<!\\)[.*+?^${}()|[\]]/g, '\\$&');
    const regex = new RegExp(`(?<![\\\\{])\\b(${safePattern})\\b(?![^{]*})`, 'gi');
    result = result.replace(regex, (match) => `\\textbf{${match}}`);
  }
  return result;
}

// ── LaTeX escape ─────────────────────────────────────────────────────────────
// Préserve les commandes LaTeX déjà présentes (ex: \textbf{} injecté par Claude)
// avant d'échapper les caractères spéciaux du reste du texte.
function esc(s: string): string {
  // Extrait les séquences \textbf{...} pour les protéger
  const placeholders: string[] = [];
  const protected_ = s.replace(/\\textbf\{[^}]*\}/g, match => {
    placeholders.push(match);
    return `\x00PLACEHOLDER${placeholders.length - 1}\x00`;
  });

  // Échappe les caractères spéciaux LaTeX
  const escaped = protected_
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');

  // Réinsère les \textbf{} originaux
  return escaped.replace(/\x00PLACEHOLDER(\d+)\x00/g, (_, i) => placeholders[Number(i)]);
}

// ── IIIT Vadodara template ────────────────────────────────────────────────────
export function generateIIITVLatex(profile: Profile): string {
  const experienceLatex = profile.experience.map(exp => (
`    \\resumeSubheading
      {${esc(exp.company)}}{${esc(exp.location)}}
      {${esc(exp.role)}}{${esc(exp.start)} -- ${esc(exp.end)}}
      \\vspace{-2.0mm}
      \\resumeItemListStart
${exp.bullets.map(b => `        \\item {${esc(boldTools(b))}}`).join('\n')}
      \\resumeItemListEnd
      \\vspace{-3.0mm}`
  )).join('\n');

  const educationLatex = profile.education.map(ed => {
    const highlights = ed.highlights.length
      ? `      \\vspace{-2.0mm}\n      \\resumeItemListStart\n${ed.highlights.map(h => `        \\item {${esc(h)}}`).join('\n')}\n      \\resumeItemListEnd\n      \\vspace{-2mm}`
      : '';
    return (
`    \\resumeSubheading
      {${esc(ed.school)}}{${esc(ed.start)}--${esc(ed.end)}}
      {${esc(ed.degree)}}{${esc(ed.location)}}
${highlights}`
    );
  }).join('\n');

  const projectsLatex = profile.projects.slice(0, 4).map(p => (
`    \\resumeProject
      {${esc(p.name)}}
      {${esc(boldTools(p.description))}}
      {${esc(p.date)}}
      {}
      \\resumeItemListStart
        \\item {\\textbf{Stack :} ${p.tech.map(esc).join(', ')}}
      \\resumeItemListEnd
      \\vspace{-2mm}`
  )).join('\n');

  const skillsLatex = Object.entries(profile.skills).map(([cat, items]) =>
    `     \\textbf{${esc(cat)}}{: \\textbf{${items.map(esc).join(', ')}}} \\\\`
  ).join('\n');

  const langsLine = profile.languages.map(l => `${esc(l.name)} (${esc(l.level)})`).join(' \\textbullet{} ');

  const certsLatex = profile.certifications.map(c =>
    `\\resumePOR{${esc(c.name)}}{}{${esc(c.issuer)} | ${esc(c.date)}}`
  ).join('\n');

  return `%-------------------------
% CV – ${esc(profile.name)}
% Généré par Job Tracker
%------------------------
\\documentclass[a4paper,11pt]{article}
\\usepackage{latexsym}
\\usepackage{xcolor}
\\usepackage{float}
\\usepackage{ragged2e}
\\usepackage[empty]{fullpage}
\\usepackage{tabularx}
\\usepackage{titlesec}
\\usepackage{geometry}
\\usepackage{marvosym}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{multicol}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
% Définition de la colonne L pour tabularx (justifiée à gauche, extensible)
\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}
\\setlength{\\multicolsep}{0pt}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\geometry{left=1.4cm, top=0.8cm, right=1.2cm, bottom=1cm}
\\urlstyle{same}
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-7pt}]
\\newcommand{\\resumeItem}[2]{\\item{\\textbf{#1}{\\hspace{0.5mm}#2 \\vspace{-0.5mm}}}}
\\newcommand{\\resumePOR}[3]{\\vspace{0.5mm}\\item
  \\begin{tabular*}{0.97\\textwidth}[t]{p{0.60\\textwidth}@{\\extracolsep{\\fill}}r}
    \\textbf{#1}\\hspace{0.3mm}#2 & \\textit{\\small{#3}}
  \\end{tabular*}\\vspace{-2mm}}
\\newcommand{\\resumeSubheading}[4]{\\vspace{0.5mm}\\item
  \\begin{tabular*}{0.98\\textwidth}[t]{p{0.65\\textwidth}@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & \\textit{\\footnotesize{#4}} \\\\
    \\textit{\\footnotesize{#3}} & \\footnotesize{#2}\\\\
  \\end{tabular*}\\vspace{-2.4mm}}
\\newcommand{\\resumeProject}[4]{\\vspace{0.5mm}\\item
  \\begin{tabular*}{0.98\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & \\textit{\\footnotesize{#3}} \\\\
  \\end{tabular*}\\vspace{-1mm}
  \\parbox{0.98\\textwidth}{\\footnotesize\\textit{#2}}\\vspace{-2mm}}
\\renewcommand{\\labelitemi}{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=*,labelsep=0mm]}
\\newcommand{\\resumeHeadingSkillStart}{\\begin{itemize}[leftmargin=*,itemsep=1.7mm, rightmargin=2ex]}
\\newcommand{\\resumeItemListStart}{\\begin{justify}\\begin{itemize}[leftmargin=3ex, rightmargin=2ex, noitemsep,labelsep=1.2mm,itemsep=0mm]\\small}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}\\vspace{2mm}}
\\newcommand{\\resumeHeadingSkillEnd}{\\end{itemize}\\vspace{-2mm}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\end{justify}\\vspace{-2mm}}
\\begin{document}
\\fontfamily{cmr}\\selectfont
%----------HEADING-----------------
\\begin{tabularx}{\\linewidth}{L r}
  \\textbf{\\Large ${esc(profile.name)}} & ${esc(profile.phone)} \\\\
  ${esc(profile.availability)} & \\href{mailto:${esc(profile.email)}}{${esc(profile.email)}} \\\\
  ${esc(profile.location)} & \\href{https://${esc(profile.github)}}{${esc(profile.github)}} \\\\[6mm]
\\end{tabularx}
\\parbox{\\linewidth}{\\small\\textit{${esc(profile.summary)}}}
\\vspace{2mm}
%-----------EDUCATION-----------
\\section{\\textbf{Formation}}
  \\resumeSubHeadingListStart
${educationLatex}
  \\resumeSubHeadingListEnd
\\vspace{-5.5mm}
%-----------EXPERIENCE-----------
\\section{\\textbf{Expérience Professionnelle}}
  \\resumeSubHeadingListStart
${experienceLatex}
  \\resumeSubHeadingListEnd
\\vspace{-8.5mm}
%-----------PROJECTS-----------
\\section{\\textbf{Projets}}
\\resumeSubHeadingListStart
${projectsLatex}
\\resumeSubHeadingListEnd
\\vspace{-5.5mm}
%-----------TECHNICAL SKILLS-----------
\\section{\\textbf{Compétences Techniques}}
 \\begin{itemize}[leftmargin=0.05in, label={}]
    \\small{\\item{
${skillsLatex}
     \\textbf{Langues}{: ${langsLine}} \\\\
    }}
 \\end{itemize}
 \\vspace{-16pt}
%-----------CERTIFICATIONS-----------
\\section{\\textbf{Certifications}}
\\vspace{-0.4mm}
\\resumeSubHeadingListStart
${certsLatex}
\\resumeSubHeadingListEnd
\\vspace{-5mm}
\\setlength{\\footskip}{4.08003pt}
\\end{document}
`;
}

// ── Compile Result ────────────────────────────────────────────────────────────
export interface CompileResult {
  success: boolean;
  pdfPath?: string;  // URL publique Vercel Blob ou chemin local en dev
  error?: string;
  latexSource: string;
}

// ── Upload PDF vers Vercel Blob ───────────────────────────────────────────────
async function uploadToBlob(buf: Buffer, filename: string): Promise<string> {
  const { put } = await import('@vercel/blob');
  const { url } = await put(`cvs/${filename}.pdf`, buf, {
    access:      'public',
    contentType: 'application/pdf',
  });
  return url;
}

// ── Sauvegarde locale (dev sans Vercel Blob) ──────────────────────────────────
async function saveLocally(buf: Buffer, filename: string): Promise<string> {
  const outDir = path.join(process.cwd(), 'public', 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, `${filename}.pdf`);
  fs.writeFileSync(dest, buf);
  return `/generated/${filename}.pdf`;
}

// ── Choisit où stocker le PDF selon l'environnement ─────────────────────────
async function storePdf(buf: Buffer, filename: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return uploadToBlob(buf, filename);
  }
  if (process.env.VERCEL) {
    // Vercel sans Blob : data URL stockée en base (PDF ~100-300KB → ~400KB base64)
    return `data:application/pdf;base64,${buf.toString('base64')}`;
  }
  return saveLocally(buf, filename);
}

// ── Cloud compilation via latex.ytotech.com ───────────────────────────────────
async function compileOnline(latex: string, filename: string): Promise<CompileResult> {
  try {
    const res = await fetch('https://latex.ytotech.com/builds/sync', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ compiler: 'pdflatex', resources: [{ main: true, content: latex }] }),
      signal:  AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { success: false, error: `ytotech ${res.status}: ${txt.slice(0, 300)}`, latexSource: latex };
    }

    const buf     = Buffer.from(await res.arrayBuffer());
    const pdfPath = await storePdf(buf, filename);
    return { success: true, pdfPath, latexSource: latex };
  } catch (e) {
    return { success: false, error: `ytotech: ${String(e)}`, latexSource: latex };
  }
}

// ── Local pdflatex (fallback si installé) ────────────────────────────────────
async function compileLocal(latex: string, filename: string): Promise<CompileResult> {
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-'));
  const texFile = path.join(tmpDir, `${filename}.tex`);
  const pdfSrc  = path.join(tmpDir, `${filename}.pdf`);
  fs.writeFileSync(texFile, latex, 'utf8');
  try {
    const cmd = `pdflatex -interaction=nonstopmode -output-directory="${tmpDir}" "${texFile}"`;
    execSync(cmd, { timeout: 30_000, stdio: 'pipe' });
    execSync(cmd, { timeout: 30_000, stdio: 'pipe' });
    if (!fs.existsSync(pdfSrc)) return { success: false, error: 'pdflatex: PDF non généré', latexSource: latex };

    const buf     = fs.readFileSync(pdfSrc);
    const pdfPath = await storePdf(buf, filename);

    return { success: true, pdfPath, latexSource: latex };
  } catch (e) {
    return { success: false, error: String(e), latexSource: latex };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  }
}

// ── Cloud compilation via texlive.net (backup) ───────────────────────────────
async function compileTeXLive(latex: string, filename: string): Promise<CompileResult> {
  try {
    const form = new FormData();
    form.append('filecontents[]', new Blob([latex], { type: 'text/plain' }), 'document.tex');
    form.append('filename[]', 'document.tex');
    form.append('engine', 'pdflatex');
    form.append('return', 'pdf');

    const res = await fetch('https://texlive.net/cgi-bin/latexcgi', {
      method: 'POST',
      body:   form,
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { success: false, error: `texlive ${res.status}: ${txt.slice(0, 300)}`, latexSource: latex };
    }

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('pdf')) {
      const txt = await res.text().catch(() => '');
      return { success: false, error: `texlive: réponse non-PDF (${ct}): ${txt.slice(0, 200)}`, latexSource: latex };
    }

    const buf     = Buffer.from(await res.arrayBuffer());
    const pdfPath = await storePdf(buf, filename);
    return { success: true, pdfPath, latexSource: latex };
  } catch (e) {
    return { success: false, error: `texlive: ${String(e)}`, latexSource: latex };
  }
}

// ── Main entry: ytotech → texlive.net → pdflatex local ───────────────────────
export async function compileLatex(latex: string, filename: string): Promise<CompileResult> {
  const online = await compileOnline(latex, filename);
  if (online.success) return online;

  const texlive = await compileTeXLive(latex, filename);
  if (texlive.success) return texlive;

  const local = await compileLocal(latex, filename);
  if (local.success) return local;

  return {
    success: false,
    error: `ytotech: ${online.error} | texlive: ${texlive.error} | local: ${local.error}`,
    latexSource: latex,
  };
}
