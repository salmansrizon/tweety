from datetime import date, datetime, timedelta, timezone

from etl import runner
from etl.models import Creator, RunConfig, Topic
from etl.tests.fakes import (
    FakeBigQueryClient,
    FakeCrashingTwitterPage,
    FakeGeminiClient,
    FakeLoginWallTwitterPage,
    FakeRedditClient,
    FakeSupabaseClient,
    _FakeSubmission,
)

TODAY = date(2026, 7, 18)


def _run_config() -> RunConfig:
    topic = Topic(id="t1", name="AI Agents", is_active=True)
    creator = Creator(id="c1", handle="r/LocalLLaMA", platform="reddit", topic_id="t1")
    return RunConfig(topics=[topic], creators=[creator], credentials=None)


def _fixture_submission(post_id="abc123", hours_ago=1) -> _FakeSubmission:
    created = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).timestamp()
    return _FakeSubmission(
        id=post_id,
        created_utc=created,
        title="Context window sizes",
        selftext="A deep dive into context windows.",
        score=100,
        num_comments=20,
        permalink=f"/r/LocalLLaMA/comments/{post_id}/",
    )


def test_dry_run_ingests_a_fixture_post_into_both_stores():
    supabase = FakeSupabaseClient()
    bigquery = FakeBigQueryClient()
    gemini = FakeGeminiClient()
    reddit = FakeRedditClient({"LocalLLaMA": [_fixture_submission()]})

    result = runner.run(
        supabase, bigquery, gemini, _run_config(), twitter_page=None, reddit_client=reddit, today=TODAY
    )

    assert result.posts_scraped == 1
    assert result.twitter_ok is True
    assert result.reddit_ok is True
    assert result.error_message is None

    vectors = supabase.store["post_vectors"]
    assert len(vectors) == 1
    assert vectors[0]["post_id"] == "abc123"
    assert vectors[0]["scraped_date"] == TODAY.isoformat()
    assert len(vectors[0]["embedding"]) == 768

    assert len(bigquery.rows) == 1
    assert bigquery.rows[0]["post_id"] == "abc123"
    assert bigquery.rows[0]["engagement_score"] == 100 * 0.7 + 20 * 0.3

    etl_runs = supabase.store["etl_runs"]
    assert len(etl_runs) == 1
    assert etl_runs[0]["run_date"] == TODAY.isoformat()
    assert etl_runs[0]["posts_scraped"] == 1
    assert etl_runs[0]["finished_at"] is not None


def test_same_day_rerun_is_idempotent():
    supabase = FakeSupabaseClient()
    bigquery = FakeBigQueryClient()
    gemini = FakeGeminiClient()
    reddit = FakeRedditClient({"LocalLLaMA": [_fixture_submission()]})
    config = _run_config()

    runner.run(supabase, bigquery, gemini, config, twitter_page=None, reddit_client=reddit, today=TODAY)
    runner.run(supabase, bigquery, gemini, config, twitter_page=None, reddit_client=reddit, today=TODAY)

    assert len(supabase.store["post_vectors"]) == 1
    assert len(bigquery.rows) == 1
    # Each run inserts its own etl_runs record; only the wipe+insert on the data
    # tables needs to be idempotent, per ADR-0004.
    assert len(supabase.store["etl_runs"]) == 2


def test_cookie_expiry_aborts_twitter_but_reddit_still_completes():
    supabase = FakeSupabaseClient()
    bigquery = FakeBigQueryClient()
    gemini = FakeGeminiClient()
    reddit = FakeRedditClient({"LocalLLaMA": [_fixture_submission()]})

    topic = Topic(id="t1", name="AI Agents", is_active=True)
    creators = [
        Creator(id="c1", handle="@sama", platform="twitter", topic_id="t1"),
        Creator(id="c2", handle="r/LocalLLaMA", platform="reddit", topic_id="t1"),
    ]
    config = RunConfig(topics=[topic], creators=creators, credentials=None)

    result = runner.run(
        supabase,
        bigquery,
        gemini,
        config,
        twitter_page=FakeLoginWallTwitterPage(),
        reddit_client=reddit,
        today=TODAY,
    )

    assert result.twitter_ok is False
    assert result.cookie_expired is True
    assert result.reddit_ok is True
    assert "login wall" in result.error_message.lower()
    # Reddit-Only Mode: the Reddit post is still ingested despite the Twitter failure.
    assert result.posts_scraped == 1
    assert len(supabase.store["post_vectors"]) == 1


def test_non_cookie_twitter_scrape_failure_still_lets_reddit_complete():
    """A general Twitter scrape exception (Playwright timeout, selector
    failure, etc.) must not crash the whole run -- only CookieExpiredError
    got caught before this test was added, so anything else propagated
    uncaught, skipped Reddit, and left the etl_runs row half-written."""
    supabase = FakeSupabaseClient()
    bigquery = FakeBigQueryClient()
    gemini = FakeGeminiClient()
    reddit = FakeRedditClient({"LocalLLaMA": [_fixture_submission()]})

    topic = Topic(id="t1", name="AI Agents", is_active=True)
    creators = [
        Creator(id="c1", handle="@sama", platform="twitter", topic_id="t1"),
        Creator(id="c2", handle="r/LocalLLaMA", platform="reddit", topic_id="t1"),
    ]
    config = RunConfig(topics=[topic], creators=creators, credentials=None)

    result = runner.run(
        supabase,
        bigquery,
        gemini,
        config,
        twitter_page=FakeCrashingTwitterPage(),
        reddit_client=reddit,
        today=TODAY,
    )

    assert result.twitter_ok is False
    assert "timeout" in result.error_message.lower()
    assert result.reddit_ok is True
    assert result.posts_scraped == 1

    etl_runs = supabase.store["etl_runs"]
    assert len(etl_runs) == 1
    assert etl_runs[0]["finished_at"] is not None
    assert etl_runs[0]["error_message"] == result.error_message


def test_retention_pruning_removes_rows_older_than_30_days():
    supabase = FakeSupabaseClient()
    bigquery = FakeBigQueryClient()
    gemini = FakeGeminiClient()
    reddit = FakeRedditClient({"LocalLLaMA": []})
    config = _run_config()

    old_date = (TODAY - timedelta(days=31)).isoformat()
    supabase.store["post_vectors"] = [
        {"post_id": "old", "topic_id": "t1", "platform": "reddit", "scraped_date": old_date, "text": "x", "embedding": [0.0] * 768}
    ]
    bigquery.rows = [
        {"post_id": "old", "scraped_at": f"{old_date}T01:00:00+00:00"}
    ]

    runner.run(supabase, bigquery, gemini, config, twitter_page=None, reddit_client=reddit, today=TODAY)

    assert supabase.store["post_vectors"] == []
    assert bigquery.rows == []
