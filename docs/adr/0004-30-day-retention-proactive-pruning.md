# ADR-0004: 30-day retention window, proactive pruning on every ETL run

**Date:** 2026-07-18
**Status:** Accepted
**Supersedes:** Portions of ADR-0002 (which referenced 60-day horizon)

---

## Context

BigQuery Sandbox allows up to 60 days before auto-expiry. Supabase free tier has a 500 MB cap. The user decided they do not need data older than 30 days on any platform.

## Decision

The **Retention Window is 30 days** across all storage layers and all Platforms. At the end of every ETL Pipeline run:

**Start of run (idempotency wipe):**
1. **Supabase:** Delete rows from `post_vectors` where `scraped_date = CURRENT_DATE` — ensures a re-run on the same day produces clean results with no duplicate embeddings.
2. **BigQuery:** Delete rows from `archive.posts` where `DATE(scraped_at) = CURRENT_DATE` — same guarantee for raw metrics.

**End of run (retention pruning):**
3. **BigQuery:** Delete rows from `archive.posts` where `scraped_at < CURRENT_DATE - 30`
4. **Supabase:** Delete rows from `post_vectors` where `scraped_date < CURRENT_DATE - 30`

All four deletions run unconditionally on every ETL execution.

## Consequences

- The Archive Horizon is 30 days. The CMS date picker must not allow selection of dates older than 30 days.
- Storage usage in both layers stays bounded and predictable.
- No cleanup script is needed beyond the ETL's own end-of-run step.
- If the user ever wants a longer window, the Retention Window value should be extracted as a configurable constant (not currently planned).
