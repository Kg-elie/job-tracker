import fs   from 'fs';
import path from 'path';

// Sur Vercel le filesystem est en lecture seule — on log uniquement en console
const IS_VERCEL = !!process.env.VERCEL;

const LOG_DIR  = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

if (!IS_VERCEL) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch { /* ignore */ }
}

type Level = 'INFO' | 'WARN' | 'ERROR';

function write(level: Level, message: string, data?: unknown) {
  const ts    = new Date().toISOString();
  const extra = data ? ' ' + JSON.stringify(data) : '';
  const line  = `[${ts}] [${level}] ${message}${extra}`;

  if (level === 'ERROR') console.error(line);
  else                   console.log(line);

  if (!IS_VERCEL) {
    try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch { /* ignore */ }
  }
}

export const log = {
  info:  (msg: string, data?: unknown) => write('INFO',  msg, data),
  warn:  (msg: string, data?: unknown) => write('WARN',  msg, data),
  error: (msg: string, data?: unknown) => write('ERROR', msg, data),
};
