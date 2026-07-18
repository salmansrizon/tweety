from datetime import datetime, timedelta, timezone

import praw

from ..models import Creator, RawPost

POST_LIMIT_PER_CREATOR = 10
LOOKBACK_HOURS = 24
# Pull more than the Post Limit so filtering (age, crossposts) still leaves enough candidates.
FETCH_LIMIT = 50


def build_client(client_id: str, client_secret: str, user_agent: str) -> praw.Reddit:
    return praw.Reddit(client_id=client_id, client_secret=client_secret, user_agent=user_agent)


def scrape_reddit(
    creators_by_topic: dict[str, tuple[str, list[Creator]]],
    reddit: praw.Reddit,
) -> list[RawPost]:
    """Fetch the top posts from the last 24h for every Reddit Creator (FR-2.4).

    creators_by_topic maps topic_id -> (topic_name, [Creator, ...]) for platform == 'reddit'.
    Caps at POST_LIMIT_PER_CREATOR posts per subreddit; excludes crossposts (FR-3.1).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HOURS)
    posts: list[RawPost] = []

    for topic_id, (topic_name, creators) in creators_by_topic.items():
        for creator in creators:
            subreddit_name = creator.handle.removeprefix("r/").removeprefix("/")
            subreddit = reddit.subreddit(subreddit_name)

            count = 0
            for submission in subreddit.top(time_filter="day", limit=FETCH_LIMIT):
                if count >= POST_LIMIT_PER_CREATOR:
                    break

                posted_at = datetime.fromtimestamp(submission.created_utc, tz=timezone.utc)
                if posted_at < cutoff:
                    continue

                is_crosspost = bool(getattr(submission, "crosspost_parent", None))
                if is_crosspost:
                    continue

                posts.append(
                    RawPost(
                        post_id=submission.id,
                        topic_id=topic_id,
                        topic_name=topic_name,
                        platform="reddit",
                        creator_handle=creator.handle,
                        posted_at=posted_at,
                        text="",
                        url=f"https://reddit.com{submission.permalink}",
                        is_retweet=False,
                        score=submission.score,
                        num_comments=submission.num_comments,
                        title=submission.title,
                        body=submission.selftext,
                    )
                )
                count += 1

    return posts
