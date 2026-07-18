-- BigQuery Sandbox: raw archive schema.
-- Run via `bq query --use_legacy_sql=false` after creating the `archive` dataset
-- (see 0002_bigquery_init.sh), or paste into the BigQuery console SQL editor.

CREATE TABLE IF NOT EXISTS archive.posts (
  post_id STRING,
  topic_id STRING,
  topic_name STRING,
  platform STRING,
  creator_handle STRING,
  posted_at TIMESTAMP,
  scraped_at TIMESTAMP,
  text STRING,
  url STRING,
  views INT64,        -- NULL for Reddit
  likes INT64,         -- NULL for Reddit (uses score)
  reposts INT64,       -- NULL for Reddit
  replies INT64,
  score INT64,          -- Reddit upvotes
  num_comments INT64,   -- Reddit comments
  engagement_score FLOAT64,
  is_top_post BOOLEAN
)
PARTITION BY DATE(scraped_at)
CLUSTER BY topic_name, platform;
