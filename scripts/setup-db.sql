-- Job Tracker — Schéma PostgreSQL (Neon)
-- Colle ce SQL dans l'éditeur SQL de ton projet Neon (console.neon.tech)

CREATE TABLE IF NOT EXISTS profile (
  id          SERIAL PRIMARY KEY,
  data        JSONB        NOT NULL,
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id               SERIAL PRIMARY KEY,
  company          TEXT         NOT NULL DEFAULT '',
  position         TEXT         NOT NULL DEFAULT '',
  job_url          TEXT         DEFAULT '',
  job_description  TEXT         DEFAULT '',
  job_analysis     TEXT         DEFAULT '{}',
  status           TEXT         DEFAULT 'interested',
  template_id      INTEGER,
  cv_json          TEXT         DEFAULT '{}',
  cv_latex         TEXT         DEFAULT '',
  cv_pdf_path      TEXT         DEFAULT '',
  letter_text      TEXT         DEFAULT '',
  notes            TEXT         DEFAULT '',
  applied_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
  id           SERIAL PRIMARY KEY,
  name         TEXT         NOT NULL,
  description  TEXT         DEFAULT '',
  content      TEXT         NOT NULL,
  is_default   INTEGER      DEFAULT 0,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
