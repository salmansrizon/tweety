# Migrations

Provisions the two storage layers described in `docs/prd.md` §4 and ADR-0004.

## Supabase (Postgres + pgvector)

```sh
# Paste into the Supabase SQL Editor, or:
psql "$SUPABASE_DB_URL" -f migrations/0001_supabase_init.sql
psql "$SUPABASE_DB_URL" -f migrations/0003_rag_summaries_and_match_fn.sql
```

**Verify:**
```sql
select extname from pg_extension where extname = 'vector'; -- 1 row
select table_name from information_schema.tables
  where table_schema = 'public'
  and table_name in ('topics','creators','app_settings','post_vectors','etl_runs','rag_summaries'); -- 6 rows
select indexname from pg_indexes where tablename = 'post_vectors'; -- includes the ivfflat index
insert into app_settings (id) values (1); -- seed the singleton settings row

-- match_post_vectors() RPC (used by the RAG API's SupabaseVectorStore, #18):
select proname from pg_proc where proname = 'match_post_vectors'; -- 1 row
```

## BigQuery (Sandbox mode)

```sh
gcloud config set project <PROJECT_ID>
./migrations/0002_bigquery_init.sh
```

**Verify:**
```sh
bq show archive.posts
bq query --use_legacy_sql=false \
  'SELECT table_name FROM archive.INFORMATION_SCHEMA.TABLES'
```

Expect `archive.posts` partitioned by `DATE(scraped_at)` and clustered by `topic_name, platform` (confirm via `bq show --format=prettyjson archive.posts` — check `timePartitioning` and `clustering.fields`).

## Notes

- Supabase free tier: keep the DB under 500 MB; the ETL prunes `post_vectors` to a 30-day retention window every run (ADR-0004).
- BigQuery Sandbox auto-expires tables after 60 days regardless of the app-level 30-day pruning (ADR-0002/0004) — no action needed, just don't rely on data surviving past 60 days if pruning is ever skipped.
- `post_vectors.embedding` is `VECTOR(768)` to match Gemini `text-embedding-004`.
