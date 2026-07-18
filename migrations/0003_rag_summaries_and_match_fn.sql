-- Adds the RAG summary cache table (FR-5.4, called out as "table TBD" in
-- #18) and the match_post_vectors() RPC that LangChain's SupabaseVectorStore
-- calls for similarity search. post_vectors stores topic_id/scraped_date as
-- native columns rather than a generic metadata jsonb blob, so this is a
-- custom RPC (not the library's default match_documents) that filters on
-- those columns directly while still accepting the {filter: jsonb} call
-- shape SupabaseVectorStore sends for an object-style filter.

-- The RAG chat cites source post URLs (#18), but the web app only has
-- Supabase access (GCP_SA_KEY / BigQuery is ETL-only per the env var
-- split) -- so the post URL needs to live in post_vectors too, not just
-- BigQuery's archive.posts.
ALTER TABLE post_vectors ADD COLUMN url TEXT;

CREATE TABLE rag_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  scraped_date DATE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (topic_id, scraped_date)
);

CREATE OR REPLACE FUNCTION match_post_vectors(
  query_embedding vector(768),
  match_count int,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    post_vectors.id,
    post_vectors.text AS content,
    jsonb_build_object(
      'post_id', post_vectors.post_id,
      'topic_id', post_vectors.topic_id,
      'platform', post_vectors.platform,
      'scraped_date', post_vectors.scraped_date,
      'url', post_vectors.url
    ) AS metadata,
    1 - (post_vectors.embedding <=> query_embedding) AS similarity
  FROM post_vectors
  WHERE
    (filter->>'topic_id' IS NULL OR post_vectors.topic_id = (filter->>'topic_id')::uuid)
    AND (filter->>'scraped_date' IS NULL OR post_vectors.scraped_date = (filter->>'scraped_date')::date)
  ORDER BY post_vectors.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
