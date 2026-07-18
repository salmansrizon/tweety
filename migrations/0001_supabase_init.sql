-- Supabase (Postgres + pgvector) initial schema.
-- Run once against a fresh Supabase project (SQL Editor or `supabase db push`).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- Configuration tables

CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,         -- e.g. "@elonmusk" or "r/MachineLearning"
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'reddit')),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  twitter_auth_token TEXT,
  twitter_ct0 TEXT,
  reddit_client_id TEXT,
  reddit_client_secret TEXT,
  reddit_user_agent TEXT DEFAULT 'Tweety/1.0',
  last_run_status TEXT,
  last_run_at TIMESTAMPTZ
);

-- Vector table for LangChain RAG

CREATE TABLE post_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT UNIQUE NOT NULL, -- Twitter Tweet ID or Reddit Post ID
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'reddit')),
  scraped_date DATE NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(768) -- Gemini text-embedding-004 dimension
);

CREATE INDEX ON post_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Indexes supporting the ETL idempotency wipe and retention pruning (ADR-0004),
-- and the Archive Viewer's topic_id + scraped_date metadata filtering (#18).
CREATE INDEX ON post_vectors (scraped_date);
CREATE INDEX ON post_vectors (topic_id, scraped_date);

-- ETL monitoring table: drives the Settings ETL Runs Panel (#16) and the
-- Archive Viewer's Reddit-Only Mode warning banner (#17).

CREATE TABLE etl_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date      DATE NOT NULL UNIQUE,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  twitter_ok    BOOLEAN,
  reddit_ok     BOOLEAN,
  posts_scraped INT,
  error_message TEXT
);
