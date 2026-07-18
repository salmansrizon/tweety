# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository is **pre-implementation** — it currently contains only planning documents (PRD, BRD, ADRs, glossary) and no source code. The planned monorepo layout (`/etl/`, `/web/`, `.github/workflows/`) does not exist yet; creating it is tracked as GitHub issue #12. There are no build/lint/test commands to run until that scaffolding lands — check `/etl/requirements.txt` and `/web/package.json` once they exist for the real commands.

Work is tracked as GitHub issues using a "Wayfinder" convention: issue #10 is the map (overall destination + constraints), and issues #11–#18 are tasks/prototypes labeled `wayfinder:task` / `wayfinder:prototype`, each with explicit "Blocked by" / "Blocks" dependencies. Read the map issue and an issue's dependencies before starting work on it.

## Product name

The product is **Tweety**. `docs/brd.md` and `docs/prd.md` still refer to it as "TopicRadar" — that name is retired (see `CONTEXT.md`). Treat `CONTEXT.md` as the canonical glossary; where the PRD/BRD conflict with an ADR, the ADR wins (it's a later decision).

## Planned architecture

Tweety is a zero-cost, serverless, multi-platform scraper and RAG archive CMS, split into two independently deployable pieces in one monorepo:

- **`/etl/`** — Python 3.11 batch pipeline, run daily by GitHub Actions (`.github/workflows/etl.yml`, cron `0 1 * * *`). Fetches config from Supabase → scrapes Twitter (Playwright + injected cookies) and Reddit (PRAW) → scores and normalizes posts → generates Gemini `text-embedding-004` embeddings → writes raw metrics to BigQuery and vectors to Supabase `post_vectors` → prunes both stores to the retention window. Hard-capped at `timeout-minutes: 25` (this budget is shared with another project on the same GitHub account — see ADR-0001).
- **`/web/`** — Next.js 14 (App Router) + TailwindCSS CMS on Vercel. Supabase-Auth-gated dashboard for managing Topics/Creators/credentials, an Archive Viewer (30-day calendar + filters + post cards), and a LangChain.js-orchestrated RAG chat API (`/api/rag-query`) that queries Supabase `post_vectors` and generates answers via the OpenRouter free model router.

Data flows one direction: GitHub Actions ETL writes → Supabase (config + vectors) and BigQuery (raw metrics) → Next.js reads both for the Archive UI and RAG pipeline. The web app never scrapes or writes credentials client-side; `app_settings` (cookies, API keys) is server-only.

## Non-negotiable constraints (from the ADRs and Wayfinder map)

These override anything in the PRD/BRD that predates them:

- **ETL runtime ≤ 25 min/run**, enforced via `timeout-minutes: 25`; Playwright must terminate cleanly on SIGTERM (ADR-0001).
- **Retention Window = 30 days** across *both* BigQuery and Supabase, not BigQuery's 60-day sandbox default (ADR-0004 supersedes ADR-0002 on this point). Every ETL run: wipe today's rows at start (idempotency), prune rows `< CURRENT_DATE - 30` at end, unconditionally, in both stores.
- **Post Limit:** top 10 posts per Creator per day per Platform. Retweets/cross-posts excluded.
- **OpenRouter free model router only** — always `model: "openrouter/auto"` / `baseURL: https://openrouter.ai/api/v1"`, never a hard-coded model name (ADR-0003).
- **Gemini embeddings** capped at 1,500 requests/day; batch where possible.
- **Twitter Cookie Expiry Alert**: on a detected login wall, abort Twitter scraping only, log `last_run_status = "Twitter Cookie Expired"` + write to `etl_runs`, emit a GitHub Actions `::error::` annotation, and continue with Reddit (this is a valid "Reddit-Only Mode" success state, not a failure).
- **Supabase auto-pause**: the daily ETL run is the only keep-alive; no separate keep-alive job is planned.
- Credentials (Twitter cookies, Reddit API keys) live only in Supabase `app_settings`, never sent to the client browser.

## Data model reference

Full schemas are in `docs/prd.md` §4 (Supabase tables: `topics`, `creators`, `app_settings`, `post_vectors` with a 768-dim `pgvector` column + ivfflat index; BigQuery `archive.posts` partitioned by `DATE(scraped_at)`, clustered by `topic_name, platform`) and the `etl_runs` monitoring table defined in issue #11 (tracks per-day `twitter_ok`/`reddit_ok`/`posts_scraped`/`error_message`, used to drive Reddit-Only Mode warnings in the Archive Viewer).

## Docs map

- `CONTEXT.md` — canonical glossary/terminology; consult first when a term is ambiguous.
- `docs/prd.md` — product requirements, architecture diagram, data models, scoring formula, LangChain integration sketch.
- `docs/brd.md` — business requirements, success metrics, risks/mitigations.
- `docs/adr/000N-*.md` — accepted architecture decisions; check these for anything that has since overridden the PRD/BRD.
