from datetime import date

from .models import RawPost


def wipe_today(client, today: date) -> None:
    """Idempotency wipe: delete post_vectors rows for today before inserting (ADR-0004)."""
    client.table("post_vectors").delete().eq("scraped_date", today.isoformat()).execute()


def write_post_vectors(
    client,
    run_date: date,
    posts: list[RawPost],
    texts: list[str],
    embeddings: list[list[float]],
) -> None:
    """Insert normalized text + metadata + embedding for each Post into post_vectors."""
    rows = [
        {
            "post_id": post.post_id,
            "topic_id": post.topic_id,
            "platform": post.platform,
            "scraped_date": run_date.isoformat(),
            "text": text,
            "url": post.url,
            "embedding": embedding,
        }
        for post, text, embedding in zip(posts, texts, embeddings)
    ]
    if rows:
        client.table("post_vectors").insert(rows).execute()


def prune_older_than(client, cutoff: date) -> None:
    """Retention pruning: delete post_vectors rows older than the retention window (ADR-0004)."""
    client.table("post_vectors").delete().lt("scraped_date", cutoff.isoformat()).execute()
