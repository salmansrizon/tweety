from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Topic:
    id: str
    name: str
    is_active: bool


@dataclass
class Creator:
    id: str
    handle: str  # e.g. "@sama" or "r/LocalLLaMA"
    platform: str  # 'twitter' | 'reddit'
    topic_id: str


@dataclass
class Credentials:
    twitter_auth_token: Optional[str]
    twitter_ct0: Optional[str]
    reddit_client_id: Optional[str]
    reddit_client_secret: Optional[str]
    reddit_user_agent: str


@dataclass
class RunConfig:
    topics: list[Topic]
    creators: list[Creator]
    credentials: Credentials


@dataclass
class RawPost:
    post_id: str
    topic_id: str
    topic_name: str
    platform: str  # 'twitter' | 'reddit'
    creator_handle: str
    posted_at: datetime
    text: str
    url: str
    is_retweet: bool = False

    # Twitter metrics (None for Reddit)
    views: Optional[int] = None
    likes: Optional[int] = None
    reposts: Optional[int] = None
    replies: Optional[int] = None

    # Reddit metrics (None for Twitter)
    score: Optional[int] = None
    num_comments: Optional[int] = None

    # Reddit-only raw fields, combined by normalizer.normalize_text()
    title: Optional[str] = None
    body: Optional[str] = None
