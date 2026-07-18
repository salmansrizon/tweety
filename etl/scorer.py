from .models import RawPost

POST_LIMIT_PER_CREATOR = 10


def calculate_engagement_score(post: RawPost) -> float:
    """Cross-platform engagement score (PRD §5.2)."""
    if post.platform == "twitter":
        return (
            (post.views or 0) * 0.4
            + (post.likes or 0) * 0.3
            + (post.reposts or 0) * 0.2
            + (post.replies or 0) * 0.1
        )
    if post.platform == "reddit":
        return (post.score or 0) * 0.7 + (post.num_comments or 0) * 0.3
    raise ValueError(f"Unknown platform: {post.platform!r}")


def filter_original_posts(posts: list[RawPost]) -> list[RawPost]:
    """Exclude retweets/cross-posts -- only original content is archived (FR-3.1)."""
    return [p for p in posts if not p.is_retweet]


def top_n_per_creator(posts: list[RawPost], n: int = POST_LIMIT_PER_CREATOR) -> list[RawPost]:
    """Cap to the Post Limit: top N per Creator per Platform, ranked by engagement score."""
    by_creator: dict[tuple[str, str], list[RawPost]] = {}
    for post in posts:
        by_creator.setdefault((post.creator_handle, post.platform), []).append(post)

    result: list[RawPost] = []
    for group in by_creator.values():
        group.sort(key=calculate_engagement_score, reverse=True)
        result.extend(group[:n])
    return result
