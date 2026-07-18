import os

from supabase import Client, create_client

from .models import Credentials, Creator, RunConfig, Topic


def build_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    return create_client(url, key)


def fetch_run_config(client: Client) -> RunConfig:
    """Fetch active Topics, their Creators, and platform credentials from Supabase (FR-2.2)."""
    topics_rows = client.table("topics").select("*").eq("is_active", True).execute().data
    topics = [Topic(id=r["id"], name=r["name"], is_active=r["is_active"]) for r in topics_rows]

    topic_ids = [t.id for t in topics]
    creators_rows = (
        client.table("creators").select("*").in_("topic_id", topic_ids).execute().data
        if topic_ids
        else []
    )
    creators = [
        Creator(id=r["id"], handle=r["handle"], platform=r["platform"], topic_id=r["topic_id"])
        for r in creators_rows
    ]

    settings_row = client.table("app_settings").select("*").eq("id", 1).single().execute().data
    credentials = Credentials(
        twitter_auth_token=settings_row.get("twitter_auth_token"),
        twitter_ct0=settings_row.get("twitter_ct0"),
        reddit_client_id=settings_row.get("reddit_client_id"),
        reddit_client_secret=settings_row.get("reddit_client_secret"),
        reddit_user_agent=settings_row.get("reddit_user_agent") or "Tweety/1.0",
    )

    return RunConfig(topics=topics, creators=creators, credentials=credentials)


def group_creators_by_topic(
    config: RunConfig, platform: str
) -> dict[str, tuple[str, list[Creator]]]:
    """Group a RunConfig's Creators by topic_id for a single platform, keyed for the scrapers."""
    topic_names = {t.id: t.name for t in config.topics}
    grouped: dict[str, tuple[str, list[Creator]]] = {}
    for creator in config.creators:
        if creator.platform != platform:
            continue
        topic_name = topic_names.get(creator.topic_id)
        if topic_name is None:
            continue
        _, creators = grouped.setdefault(creator.topic_id, (topic_name, []))
        creators.append(creator)
    return grouped
