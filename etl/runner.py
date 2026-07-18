import os
import signal
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from . import config as config_mod
from . import writer_bq, writer_supabase
from .embedder import build_client as build_gemini_client
from .embedder import embed_texts
from .models import RunConfig
from .normalizer import normalize_text
from .scorer import filter_original_posts, top_n_per_creator
from .scrapers.reddit import scrape_reddit
from .scrapers.twitter import scrape_twitter

RETENTION_DAYS = 30
COOKIE_EXPIRED_EXIT_CODE = 2
SIGTERM_EXIT_CODE = 143  # 128 + SIGTERM(15), the conventional shell exit code


class GracefulShutdown(Exception):
    """Raised from the SIGTERM handler so `finally: browser.close()` still runs
    before the process exits, instead of Playwright's Chromium subprocess being
    orphaned when GitHub Actions kills the job at the 25-minute budget cap
    (ADR-0001)."""


def _handle_sigterm(signum, frame) -> None:
    raise GracefulShutdown()


@dataclass
class RunResult:
    run_date: date
    twitter_ok: bool = True
    reddit_ok: bool = True
    posts_scraped: int = 0
    error_message: Optional[str] = None

    @property
    def cookie_expired(self) -> bool:
        return not self.twitter_ok


def _append_error(result: RunResult, message: str) -> None:
    result.error_message = f"{result.error_message}; {message}" if result.error_message else message


def run(
    supabase_client,
    bigquery_client,
    gemini_client,
    run_config: RunConfig,
    twitter_page,
    reddit_client,
    today: Optional[date] = None,
) -> RunResult:
    """Orchestrate a full ETL run: wipe -> scrape -> score -> embed -> write -> prune.

    All clients/creator credentials are injected so this can run against
    fakes in tests without live Supabase/BigQuery/Gemini/Twitter/Reddit access.
    """
    today = today or datetime.now(timezone.utc).date()
    result = RunResult(run_date=today)
    started_at = datetime.now(timezone.utc)

    supabase_client.table("etl_runs").insert(
        {"run_date": today.isoformat(), "started_at": started_at.isoformat()}
    ).execute()

    # Idempotency wipe (ADR-0004): a same-day re-run must not duplicate rows.
    writer_supabase.wipe_today(supabase_client, today)
    writer_bq.wipe_today(bigquery_client, today)

    since_date = (today - timedelta(days=1)).isoformat()
    posts = []

    twitter_creators = config_mod.group_creators_by_topic(run_config, "twitter")
    if twitter_creators:
        try:
            posts.extend(scrape_twitter(twitter_page, twitter_creators, since_date))
        except Exception as e:
            # Covers CookieExpiredError and any other scrape failure (#14) --
            # Twitter aborts, Reddit still proceeds below (Reddit-Only Mode),
            # and the run finishes normally so etl_runs is fully populated.
            result.twitter_ok = False
            _append_error(result, str(e))

    reddit_creators = config_mod.group_creators_by_topic(run_config, "reddit")
    if reddit_creators:
        try:
            posts.extend(scrape_reddit(reddit_creators, reddit_client))
        except Exception as e:
            result.reddit_ok = False
            _append_error(result, str(e))

    posts = filter_original_posts(posts)
    posts = top_n_per_creator(posts)

    if posts:
        texts = [normalize_text(p) for p in posts]
        embeddings = embed_texts(gemini_client, texts)
        writer_supabase.write_post_vectors(supabase_client, today, posts, texts, embeddings)
        writer_bq.write_posts(bigquery_client, posts)

    result.posts_scraped = len(posts)

    # Retention pruning (ADR-0004): runs unconditionally, even on a degraded run.
    cutoff = today - timedelta(days=RETENTION_DAYS)
    writer_supabase.prune_older_than(supabase_client, cutoff)
    writer_bq.prune_older_than(bigquery_client, cutoff)

    finished_at = datetime.now(timezone.utc)
    supabase_client.table("etl_runs").update(
        {
            "finished_at": finished_at.isoformat(),
            "twitter_ok": result.twitter_ok,
            "reddit_ok": result.reddit_ok,
            "posts_scraped": result.posts_scraped,
            "error_message": result.error_message,
        }
    ).eq("run_date", today.isoformat()).execute()

    return result


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_sigterm)

    supabase_client = config_mod.build_client()
    run_config = config_mod.fetch_run_config(supabase_client)

    from google.cloud import bigquery as bq

    bigquery_client = bq.Client()

    gemini_client = build_gemini_client(os.environ["GEMINI_API_KEY"])

    from .scrapers.reddit import build_client as build_reddit_client

    reddit_client = build_reddit_client(
        run_config.credentials.reddit_client_id,
        run_config.credentials.reddit_client_secret,
        run_config.credentials.reddit_user_agent,
    )

    from playwright.sync_api import sync_playwright

    from .scrapers.twitter import new_context_page

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            twitter_page = new_context_page(
                browser,
                run_config.credentials.twitter_auth_token,
                run_config.credentials.twitter_ct0,
            )
            result = run(
                supabase_client, bigquery_client, gemini_client, run_config, twitter_page, reddit_client
            )
        except GracefulShutdown:
            print("Received SIGTERM -- closed the browser and exiting.", file=sys.stderr)
            sys.exit(SIGTERM_EXIT_CODE)
        finally:
            browser.close()

    if result.cookie_expired:
        sys.exit(COOKIE_EXPIRED_EXIT_CODE)


if __name__ == "__main__":
    main()
