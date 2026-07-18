from datetime import date, datetime, timezone

from google.cloud import bigquery

from .models import RawPost
from .scorer import calculate_engagement_score

TABLE = "archive.posts"


def wipe_today(client: bigquery.Client, today: date) -> None:
    """Idempotency wipe: delete archive.posts rows for today before inserting (ADR-0004)."""
    client.query(
        f"DELETE FROM `{TABLE}` WHERE DATE(scraped_at) = @today",
        job_config=bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("today", "DATE", today.isoformat())]
        ),
    ).result()


def write_posts(client: bigquery.Client, posts: list[RawPost]) -> None:
    """Insert raw metrics + computed engagement_score for each Post into archive.posts."""
    scraped_at = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "post_id": p.post_id,
            "topic_id": p.topic_id,
            "topic_name": p.topic_name,
            "platform": p.platform,
            "creator_handle": p.creator_handle,
            "posted_at": p.posted_at.isoformat() if hasattr(p.posted_at, "isoformat") else p.posted_at,
            "scraped_at": scraped_at,
            "text": p.text,
            "url": p.url,
            "views": p.views,
            "likes": p.likes,
            "reposts": p.reposts,
            "replies": p.replies,
            "score": p.score,
            "num_comments": p.num_comments,
            "engagement_score": calculate_engagement_score(p),
            "is_top_post": True,  # posts reaching this writer already passed top_n_per_creator()
        }
        for p in posts
    ]
    if not rows:
        return
    errors = client.insert_rows_json(TABLE, rows)
    if errors:
        raise RuntimeError(f"BigQuery insert errors: {errors}")


def prune_older_than(client: bigquery.Client, cutoff: date) -> None:
    """Retention pruning: delete archive.posts rows older than the retention window (ADR-0004)."""
    cutoff_ts = datetime.combine(cutoff, datetime.min.time(), tzinfo=timezone.utc)
    client.query(
        f"DELETE FROM `{TABLE}` WHERE scraped_at < @cutoff",
        job_config=bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("cutoff", "TIMESTAMP", cutoff_ts.isoformat())]
        ),
    ).result()
