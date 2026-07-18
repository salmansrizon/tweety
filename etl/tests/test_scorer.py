from datetime import datetime, timezone

import pytest

from etl.models import RawPost
from etl.scorer import calculate_engagement_score, filter_original_posts, top_n_per_creator


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


def test_calculate_engagement_score_twitter():
    post = _post(views=1000, likes=100, reposts=50, replies=10)
    assert calculate_engagement_score(post) == pytest.approx(1000 * 0.4 + 100 * 0.3 + 50 * 0.2 + 10 * 0.1)


def test_calculate_engagement_score_reddit():
    post = _post(platform="reddit", creator_handle="r/LocalLLaMA", score=200, num_comments=40)
    assert calculate_engagement_score(post) == pytest.approx(200 * 0.7 + 40 * 0.3)


def test_calculate_engagement_score_missing_metrics_default_to_zero():
    post = _post(views=None, likes=None, reposts=None, replies=None)
    assert calculate_engagement_score(post) == 0


def test_calculate_engagement_score_unknown_platform_raises():
    post = _post(platform="mastodon")
    with pytest.raises(ValueError):
        calculate_engagement_score(post)


def test_filter_original_posts_excludes_retweets():
    posts = [_post(post_id="1", is_retweet=False), _post(post_id="2", is_retweet=True)]
    result = filter_original_posts(posts)
    assert [p.post_id for p in result] == ["1"]


def test_top_n_per_creator_caps_and_ranks_by_score():
    posts = [
        _post(post_id=str(i), likes=i, views=0, reposts=0, replies=0)
        for i in range(15)
    ]
    result = top_n_per_creator(posts, n=10)
    assert len(result) == 10
    assert [p.post_id for p in result] == [str(i) for i in range(14, 4, -1)]


def test_top_n_per_creator_groups_independently_per_creator_and_platform():
    posts = [
        _post(post_id="a1", creator_handle="@sama", platform="twitter", likes=5, views=0, reposts=0, replies=0),
        _post(post_id="a2", creator_handle="@sama", platform="twitter", likes=1, views=0, reposts=0, replies=0),
        _post(post_id="b1", creator_handle="r/LocalLLaMA", platform="reddit", score=100, num_comments=0),
    ]
    result = top_n_per_creator(posts, n=10)
    assert {p.post_id for p in result} == {"a1", "a2", "b1"}
