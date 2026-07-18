import random
import time

from playwright.sync_api import Browser, Page
from playwright_stealth import stealth_sync

from ..models import Creator, RawPost

POST_LIMIT_PER_CREATOR = 10

# A handful of common Chrome UA strings, rotated per run to avoid a single
# fingerprint being flagged across every scrape.
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
]
VIEWPORTS = [{"width": 1366, "height": 768}, {"width": 1920, "height": 1080}]


class CookieExpiredError(Exception):
    """Raised when Playwright detects a Twitter login wall (cookie expiration)."""


def _human_delay(min_s: float = 1.5, max_s: float = 4.0) -> None:
    time.sleep(random.uniform(min_s, max_s))


def _build_search_query(handles: list[str], topic_name: str, since_date: str) -> str:
    handle_clause = " OR ".join(f"from:{h.lstrip('@')}" for h in handles)
    return f'({handle_clause}) "{topic_name}" since:{since_date}'


def new_context_page(browser: Browser, auth_token: str, ct0: str) -> Page:
    """Create a stealth-hardened Playwright page with the user's Twitter session cookies injected."""
    context = browser.new_context(
        user_agent=random.choice(USER_AGENTS),
        viewport=random.choice(VIEWPORTS),
    )
    context.add_cookies(
        [
            {"name": "auth_token", "value": auth_token, "domain": ".twitter.com", "path": "/"},
            {"name": "ct0", "value": ct0, "domain": ".twitter.com", "path": "/"},
        ]
    )
    page = context.new_page()
    stealth_sync(page)
    return page


def _is_login_wall(page: Page) -> bool:
    return (
        page.locator('[data-testid="primaryColumn"]').count() == 0
        and page.locator("text=Log in").count() > 0
    )


def _parse_tweet_article(article, topic_id: str, topic_name: str) -> RawPost:
    """Best-effort DOM parse of a single tweet `<article>` element.

    Selectors here are a starting point -- Twitter's DOM structure shifts
    often enough that these should be re-validated against a live,
    authenticated session before the ETL runs for real.
    """
    handle = article.locator('[data-testid="User-Name"] a[href^="/"]').first.get_attribute("href").lstrip("/")
    tweet_link = article.locator('a:has(time)').first
    href = tweet_link.get_attribute("href") or ""
    tweet_id = href.rstrip("/").split("/")[-1]
    timestamp = article.locator("time").first.get_attribute("datetime")
    text = article.locator('[data-testid="tweetText"]').inner_text() if article.locator('[data-testid="tweetText"]').count() else ""
    is_retweet = article.locator('[data-testid="socialContext"]').count() > 0

    def _metric(testid: str) -> int:
        el = article.locator(f'[data-testid="{testid}"]')
        if el.count() == 0:
            return 0
        label = el.first.get_attribute("aria-label") or ""
        digits = "".join(ch for ch in label.split(" ")[0] if ch.isdigit())
        return int(digits) if digits else 0

    return RawPost(
        post_id=tweet_id,
        topic_id=topic_id,
        topic_name=topic_name,
        platform="twitter",
        creator_handle=f"@{handle}",
        posted_at=timestamp,
        text=text,
        url=f"https://twitter.com{href}",
        is_retweet=is_retweet,
        views=_metric("app-text-transition-container"),
        likes=_metric("like"),
        reposts=_metric("retweet"),
        replies=_metric("reply"),
    )


def _extract_visible_tweets(page: Page, topic_id: str, topic_name: str) -> list[RawPost]:
    articles = page.locator('article[data-testid="tweet"]')
    results = []
    for i in range(articles.count()):
        try:
            results.append(_parse_tweet_article(articles.nth(i), topic_id, topic_name))
        except Exception:
            continue
    return results


def scrape_twitter(
    page: Page,
    creators_by_topic: dict[str, tuple[str, list[Creator]]],
    since_date: str,
) -> list[RawPost]:
    """Scrape up to POST_LIMIT_PER_CREATOR original posts per Twitter Creator (FR-2.3).

    creators_by_topic maps topic_id -> (topic_name, [Creator, ...]) for platform == 'twitter'.
    Raises CookieExpiredError if a login wall is detected for any topic's search.
    """
    posts: list[RawPost] = []

    for topic_id, (topic_name, creators) in creators_by_topic.items():
        handles = [c.handle for c in creators]
        query = _build_search_query(handles, topic_name, since_date)
        page.goto(f"https://twitter.com/search?q={query}&src=typed_query&f=live")
        _human_delay()

        if _is_login_wall(page):
            raise CookieExpiredError("Twitter login wall detected -- cookies expired")

        per_creator_counts = {c.handle: 0 for c in creators}
        seen_ids: set[str] = set()

        while any(count < POST_LIMIT_PER_CREATOR for count in per_creator_counts.values()):
            progressed = False
            for tweet in _extract_visible_tweets(page, topic_id, topic_name):
                if tweet.post_id in seen_ids:
                    continue
                seen_ids.add(tweet.post_id)

                if tweet.is_retweet:
                    continue
                if per_creator_counts.get(tweet.creator_handle, POST_LIMIT_PER_CREATOR) >= POST_LIMIT_PER_CREATOR:
                    continue

                posts.append(tweet)
                per_creator_counts[tweet.creator_handle] += 1
                progressed = True

            if not progressed:
                break

            page.mouse.wheel(0, 2000)
            _human_delay()

    return posts
