from datetime import datetime, timezone

from etl.models import RawPost
from etl.normalizer import MAX_CHARS, normalize_text


def _post(**overrides) -> RawPost:
    defaults = dict(
        post_id="1",
        topic_id="t1",
        topic_name="AI Agents",
        platform="twitter",
        creator_handle="@sama",
        posted_at=datetime.now(timezone.utc),
        text="hello",
        url="https://twitter.com/sama/status/1",
    )
    defaults.update(overrides)
    return RawPost(**defaults)


def test_normalize_twitter_text_strips_and_collapses_whitespace():
    post = _post(text="  hello   world  \n\n  ")
    assert normalize_text(post) == "hello world"


def test_normalize_reddit_combines_title_and_body():
    post = _post(platform="reddit", title="Rust memory safety", body="Some deep dive content.")
    assert normalize_text(post) == "Title: Rust memory safety. Body: Some deep dive content."


def test_normalize_reddit_without_body_omits_body_clause():
    post = _post(platform="reddit", title="Just a title", body="")
    assert normalize_text(post) == "Title: Just a title."


def test_normalize_truncates_to_max_chars():
    post = _post(text="x" * (MAX_CHARS + 500))
    result = normalize_text(post)
    assert len(result) == MAX_CHARS
