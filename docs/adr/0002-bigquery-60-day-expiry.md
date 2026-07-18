# ADR-0002: Accept BigQuery 60-day data expiration

**Date:** 2026-07-18
**Status:** Accepted

---

## Context

BigQuery Sandbox mode enforces a hard 60-day expiration on all tables. This cannot be disabled on the free tier. Tweety's Archive Viewer displays historical Posts to the user.

## Decision

Accept the 60-day rolling window as the effective **Archive horizon**. No export, migration, or fallback to Supabase for older data. Posts older than 60 days are silently gone from the raw metrics store.

The CMS Archive Viewer must communicate this constraint clearly — e.g., a visible "Archive available for the last 60 days" label on the date picker, with dates older than 60 days disabled.

## Alternatives considered

- **(B) Export to Google Drive / GitHub Releases before expiry** — rejected: adds significant complexity (export job, dual-source reads in the UI) for a marginal benefit.
- **(C) Fall back to Supabase `post_vectors` for data > 60 days** — rejected: Supabase holds text + metadata but not engagement metrics; partial data in the UI would be confusing and Supabase has its own 500 MB cap.

## Consequences

- The Archive horizon is 60 days. This must be documented in the CMS UI.
- If Tweety ever moves off BigQuery Sandbox (paid tier), this ADR should be revisited.
- Supabase `post_vectors` may hold vectors beyond 60 days (not governed by BigQuery expiry) — a separate cleanup job should prune them to stay under the 500 MB free-tier cap.
