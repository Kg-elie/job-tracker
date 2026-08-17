/**
 * Dual-mode database:
 *  - DATABASE_URL défini  → Neon PostgreSQL (prod Vercel)
 *  - DATABASE_URL absent  → JSON fichiers locaux (dev local)
 */

// ── Types ────────────────────────────────────────────────────────────────────
export interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  availability: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Record<string, string[]>;
  languages: Language[];
  projects: Project[];
  certifications: Certification[];
}

export interface Experience {
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface Education {
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  highlights: string[];
}

export interface Language      { name: string; level: string; }
export interface Project       { name: string; date: string; description: string; tech: string[]; }
export interface Certification { name: string; issuer: string; date: string; }

export interface Application {
  id: number;
  company: string;
  position: string;
  job_url: string;
  job_description: string;
  job_analysis: string;
  status: 'interested' | 'pending' | 'interview' | 'rejected' | 'accepted';
  template_id: number | null;
  cv_json: string;
  cv_latex: string;
  cv_pdf_path: string;
  letter_text: string;
  notes: string;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  content: string;
  is_default: number;
  created_at: string;
}

// ── Default profile ───────────────────────────────────────────────────────────
const DEFAULT_PROFILE: Profile = {
  id:           1,
  name:         'Kanga Elie',
  email:        'eliekanga@proton.me',
  phone:        '+33 06 95 71 32 31',
  location:     'Paris, France',
  github:       'github.com/eliekanga',
  linkedin:     '',
  availability: 'Septembre 2026',
  summary:      "Prochainement diplômé du Master Informatique spécialisé en Data Science avec une forte expérience chez BNP Paribas en création de tableaux de bord et suivi de KPI. Trilingue (FR/EN/IT) et passionné par la Data, disponible dès septembre 2026.",
  experience: [{
    company: 'BNP Paribas', role: 'Data Analyst — Alternance',
    location: 'Paris, France', start: 'Sep 2024', end: 'Présent',
    bullets: [
      "Production de KPI & Suivi de Performance avec Tableau Prep : Conception et automatisation de rapports KPI réguliers pour surveiller l'efficacité des programmes de formation (taux de complétion, acquisition de compétences), permettant une prise de décision éclairée pour les équipes RH et la direction.",
      "Développement de Tableaux de Bord avec Tableau Desktop & Power BI : Création et maintenance de tableaux de bord interactifs (suivi des formations, mesures d'engagement), facilitant l'accès aux données en temps réel pour les parties prenantes.",
      "Collaboration Transverse : Alignement des solutions de données avec les objectifs métiers en traduisant des analyses techniques en stratégies opérationnelles pour les équipes RH, pilotage et transformation digitale.",
    ],
  }],
  education: [
    { school: 'Université Paris Saclay', degree: 'Master Informatique pour la science des données (ISD)', location: 'Orsay, France', start: '2024', end: '2026', highlights: ['Spécialisation : Data Science / Génie Logiciel / IA', 'Cours : Algorithmes, Machine Learning, Visualisation, Statistiques & Probabilités'] },
    { school: 'Université de Versailles Saint-Quentin', degree: 'Licence Informatique', location: 'Versailles, France', start: '2021', end: '2024', highlights: [] },
    { school: 'Institut Saint Dominique de Rome', degree: 'Baccalauréat Scientifique (Mention)', location: 'Rome, Italie', start: '2020', end: '2021', highlights: [] },
  ],
  skills: {
    'Langages':             ['Python', 'Rust', 'Java', 'Julia', 'R', 'SQL'],
    'Outils & Plateformes': ['Git', 'Oracle', 'Hadoop', 'Teradata', 'Dataiku', 'Tableau', 'Power BI', 'Snowflake', 'IBM Studio'],
  },
  languages: [
    { name: 'Français', level: 'Maternelle' },
    { name: 'Anglais',  level: 'C1' },
    { name: 'Italien',  level: 'C2' },
  ],
  projects: [
    { name: 'NutriRag',                   date: 'Jan 2026', description: "Agent conversationnel RAG répondant aux demandes culinaires et nutritionnelles.",           tech: ['RAG', 'Snowflake', 'Python'] },
    { name: 'Gestionnaire de ticket SAV',  date: '2026',     description: "Assistant IA RAG répondant aux interrogations utilisateurs sur des problématiques SAV.",  tech: ['RAG', 'Snowflake', 'Python'] },
    { name: 'GPS Courchevel',              date: '2024',     description: "Implémentation de l'algorithme du plus court chemin pour la station de ski de Courchevel.", tech: ['Python', 'Algorithmes de graphes'] },
    { name: 'BDD Relationnelle',           date: '2024',     description: "Modélisation et déploiement d'une base de données Oracle pour une chaîne de concessionnaires automobiles.", tech: ['Oracle', 'SQL'] },
  ],
  certifications: [
    { name: 'Python for Data Science, AI & Development', issuer: 'IBM',     date: '2024' },
    { name: 'Dataiku Advanced Core Designer',            issuer: 'Dataiku', date: '2026' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// MODE DÉTECTION
// ════════════════════════════════════════════════════════════════════════════
function useNeon(): boolean {
  return !!process.env.DATABASE_URL;
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND JSON (dev local)
// ════════════════════════════════════════════════════════════════════════════
import path from 'path';
import fs   from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch { /* read-only filesystem (Vercel) — ignoré */ }
}
function readJSON<T>(file: string, fallback: T): T {
  try {
    ensureDir();
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch { return fallback; }
}
function writeJSON<T>(file: string, data: T): void {
  try {
    ensureDir();
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    throw new Error(`Impossible d'écrire en base locale. Sur Vercel, configure DATABASE_URL. (${e})`);
  }
}

const json = {
  getProfile():    Profile       { return readJSON<Profile>('profile.json', DEFAULT_PROFILE); },
  saveProfile(d: Partial<Profile>) { writeJSON('profile.json', { ...json.getProfile(), ...d }); },

  listApplications(): Application[] {
    return readJSON<Application[]>('applications.json', [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  getApplication(id: number): Application | undefined {
    return readJSON<Application[]>('applications.json', []).find(a => a.id === id);
  },
  createApplication(data: Partial<Application>): number {
    const apps = readJSON<Application[]>('applications.json', []);
    const id   = apps.length > 0 ? Math.max(...apps.map(a => a.id)) + 1 : 1;
    const now  = new Date().toISOString();
    apps.push({ id, company: '', position: '', job_url: '', job_description: '', job_analysis: '{}', status: 'interested', template_id: null, cv_json: '{}', cv_latex: '', cv_pdf_path: '', letter_text: '', notes: '', applied_at: null, created_at: now, updated_at: now, ...data });
    writeJSON('applications.json', apps);
    return id;
  },
  updateApplication(id: number, data: Partial<Application>) {
    const apps = readJSON<Application[]>('applications.json', []);
    const idx  = apps.findIndex(a => a.id === id);
    if (idx === -1) return;
    apps[idx] = { ...apps[idx], ...data, updated_at: new Date().toISOString() };
    writeJSON('applications.json', apps);
  },
  deleteApplication(id: number) {
    writeJSON('applications.json', readJSON<Application[]>('applications.json', []).filter(a => a.id !== id));
  },

  listTemplates():   Template[] { return readJSON<Template[]>('templates.json', []).sort((a,b) => b.is_default - a.is_default); },
  getTemplate(id: number): Template | undefined { return readJSON<Template[]>('templates.json', []).find(t => t.id === id); },
  createTemplate(data: Pick<Template,'name'|'description'|'content'>): number {
    const ts = readJSON<Template[]>('templates.json', []);
    const id = ts.length > 0 ? Math.max(...ts.map(t => t.id)) + 1 : 1;
    ts.push({ id, is_default: 0, created_at: new Date().toISOString(), ...data });
    writeJSON('templates.json', ts);
    return id;
  },
  updateTemplate(id: number, data: Partial<Pick<Template,'name'|'description'|'content'|'is_default'>>) {
    const ts  = readJSON<Template[]>('templates.json', []);
    const idx = ts.findIndex(t => t.id === id);
    if (idx === -1) return;
    ts[idx] = { ...ts[idx], ...data };
    writeJSON('templates.json', ts);
  },
  deleteTemplate(id: number) {
    writeJSON('templates.json', readJSON<Template[]>('templates.json', []).filter(t => t.id !== id));
  },
};

// ════════════════════════════════════════════════════════════════════════════
// BACKEND NEON (prod Vercel)
// ════════════════════════════════════════════════════════════════════════════
async function getNeon() {
  const { neon } = await import('@neondatabase/serverless');
  return neon(process.env.DATABASE_URL!);
}

const pg = {
  async getProfile(): Promise<Profile> {
    const sql  = await getNeon();
    const rows = await sql`SELECT data FROM profile WHERE id = 1`;
    if (rows.length === 0) {
      await sql`INSERT INTO profile (id, data) VALUES (1, ${JSON.stringify(DEFAULT_PROFILE)}) ON CONFLICT (id) DO NOTHING`;
      return DEFAULT_PROFILE;
    }
    return rows[0].data as Profile;
  },
  async saveProfile(data: Partial<Profile>): Promise<void> {
    const sql     = await getNeon();
    const current = await pg.getProfile();
    await sql`INSERT INTO profile (id, data, updated_at) VALUES (1, ${JSON.stringify({ ...current, ...data })}, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
  },

  async listApplications(): Promise<Application[]> {
    const sql = await getNeon();
    return (await sql`SELECT * FROM applications ORDER BY created_at DESC`) as unknown as Application[];
  },
  async getApplication(id: number): Promise<Application | undefined> {
    const sql  = await getNeon();
    const rows = await sql`SELECT * FROM applications WHERE id = ${id}`;
    return rows[0] as unknown as Application | undefined;
  },
  async createApplication(data: Partial<Application>): Promise<number> {
    const sql  = await getNeon();
    const rows = await sql`
      INSERT INTO applications (company,position,job_url,job_description,job_analysis,status,template_id,cv_json,cv_latex,cv_pdf_path,letter_text,notes,applied_at)
      VALUES (${data.company??''},${data.position??''},${data.job_url??''},${data.job_description??''},${data.job_analysis??'{}'},${data.status??'interested'},${data.template_id??null},${data.cv_json??'{}'},${data.cv_latex??''},${data.cv_pdf_path??''},${data.letter_text??''},${data.notes??''},${data.applied_at??null})
      RETURNING id`;
    return rows[0].id as number;
  },
  async updateApplication(id: number, data: Partial<Application>): Promise<void> {
    const sql     = await getNeon();
    const current = await pg.getApplication(id);
    if (!current) return;
    const m = { ...current, ...data };
    await sql`UPDATE applications SET company=${m.company},position=${m.position},job_url=${m.job_url},job_description=${m.job_description},job_analysis=${m.job_analysis},status=${m.status},template_id=${m.template_id??null},cv_json=${m.cv_json},cv_latex=${m.cv_latex},cv_pdf_path=${m.cv_pdf_path},letter_text=${m.letter_text},notes=${m.notes},applied_at=${m.applied_at??null},updated_at=NOW() WHERE id=${id}`;
  },
  async deleteApplication(id: number): Promise<void> {
    const sql = await getNeon();
    await sql`DELETE FROM applications WHERE id = ${id}`;
  },

  async listTemplates(): Promise<Template[]> {
    const sql = await getNeon();
    return (await sql`SELECT * FROM templates ORDER BY is_default DESC, created_at DESC`) as unknown as Template[];
  },
  async getTemplate(id: number): Promise<Template | undefined> {
    const sql  = await getNeon();
    const rows = await sql`SELECT * FROM templates WHERE id = ${id}`;
    return rows[0] as unknown as Template | undefined;
  },
  async createTemplate(data: Pick<Template,'name'|'description'|'content'>): Promise<number> {
    const sql  = await getNeon();
    const rows = await sql`INSERT INTO templates (name,description,content,is_default) VALUES (${data.name},${data.description},${data.content},0) RETURNING id`;
    return rows[0].id as number;
  },
  async updateTemplate(id: number, data: Partial<Pick<Template,'name'|'description'|'content'|'is_default'>>): Promise<void> {
    const sql     = await getNeon();
    const current = await pg.getTemplate(id);
    if (!current) return;
    const m = { ...current, ...data };
    await sql`UPDATE templates SET name=${m.name},description=${m.description},content=${m.content},is_default=${m.is_default??0} WHERE id=${id}`;
  },
  async deleteTemplate(id: number): Promise<void> {
    const sql = await getNeon();
    await sql`DELETE FROM templates WHERE id = ${id}`;
  },
};

// ════════════════════════════════════════════════════════════════════════════
// API PUBLIQUE — même interface, mode auto
// ════════════════════════════════════════════════════════════════════════════
export async function getProfile():    Promise<Profile>   { return useNeon() ? pg.getProfile()    : json.getProfile(); }
export async function saveProfile(d: Partial<Profile>):     Promise<void>     { return useNeon() ? pg.saveProfile(d)   : json.saveProfile(d); }

export async function listApplications():                   Promise<Application[]>          { return useNeon() ? pg.listApplications()   : json.listApplications(); }
export async function getApplication(id: number):           Promise<Application|undefined>  { return useNeon() ? pg.getApplication(id)   : json.getApplication(id); }
export async function createApplication(d: Partial<Application>): Promise<number>           { return useNeon() ? pg.createApplication(d) : json.createApplication(d); }
export async function updateApplication(id: number, d: Partial<Application>): Promise<void>{ return useNeon() ? pg.updateApplication(id,d) : json.updateApplication(id,d); }
export async function deleteApplication(id: number):        Promise<void>                   { return useNeon() ? pg.deleteApplication(id) : json.deleteApplication(id); }

export async function listTemplates():                      Promise<Template[]>             { return useNeon() ? pg.listTemplates()      : json.listTemplates(); }
export async function getTemplate(id: number):              Promise<Template|undefined>     { return useNeon() ? pg.getTemplate(id)      : json.getTemplate(id); }
export async function createTemplate(d: Pick<Template,'name'|'description'|'content'>): Promise<number> { return useNeon() ? pg.createTemplate(d) : json.createTemplate(d); }
export async function updateTemplate(id: number, d: Partial<Pick<Template,'name'|'description'|'content'|'is_default'>>): Promise<void> { return useNeon() ? pg.updateTemplate(id,d) : json.updateTemplate(id,d); }
export async function deleteTemplate(id: number):           Promise<void>                   { return useNeon() ? pg.deleteTemplate(id)   : json.deleteTemplate(id); }
