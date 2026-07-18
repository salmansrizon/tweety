# ADR-0001: GitHub Actions per-run budget cap of 25 minutes

**Date:** 2026-07-18
**Status:** Accepted

---

## Context

Tweety's ETL pipeline runs on GitHub Actions (free tier: 2,000 min/month on private repos). The same GitHub account hosts a second project that consumes ~30 min/month. Running Tweety daily means up to 31 runs/month.

## Decision

Each Tweety ETL run must complete within **25 minutes**. If Twitter scraping (Playwright) is still running at the 24-minute mark, it must be aborted and the run must proceed with Reddit-only mode. The timeout is enforced via the GitHub Actions `timeout-minutes` field on the job.

**Budget arithmetic:**
- 31 runs × 25 min = 775 min/month (Tweety)
- Other project: ~30 min/month
- Total: ~805 min — well within 2,000 min/month

## Consequences

- Playwright scraping must be written to terminate cleanly on SIGTERM.
- Partial runs (Reddit-only) are valid and must be logged to Supabase `app_settings.last_run_status`.
- Future additions to the ETL (e.g., new platforms) must fit inside this budget.
