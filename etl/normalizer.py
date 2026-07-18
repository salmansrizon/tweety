import re

from .models import RawPost

MAX_TOKENS = 2000
# No tokenizer dependency for a zero-cost pipeline -- approximate at ~4 chars/token
# (the commonly cited average for English), which stays comfortably under the
# Gemini free-tier request limits even when it undercounts slightly.
_CHARS_PER_TOKEN = 4
MAX_CHARS = MAX_TOKENS * _CHARS_PER_TOKEN


def normalize_text(post: RawPost) -> str:
    """Produce the text sent to the Gemini embedding API (PRD §5.3)."""
    if post.platform == "reddit":
        title = (post.title or "").strip()
        body = (post.body or "").strip()
        text = f"Title: {title}. Body: {body}" if body else f"Title: {title}."
    else:
        text = (post.text or "").strip()

    text = re.sub(r"\s+", " ", text)
    return text[:MAX_CHARS]
