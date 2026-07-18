from google import genai

EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIM = 768
# Texts per embed_content call -- batching multiple texts into one request
# (rather than one request per text) is what keeps a run well under the
# 1,500 requests/day Gemini free-tier cap (PRD §5.3 / ADR budget notes).
BATCH_SIZE = 100


def build_client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def _chunks(items: list[str], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def embed_texts(client: genai.Client, texts: list[str]) -> list[list[float]]:
    """Embed normalized post texts via Gemini text-embedding-004, in BATCH_SIZE-sized calls."""
    embeddings: list[list[float]] = []
    for batch in _chunks(texts, BATCH_SIZE):
        response = client.models.embed_content(model=EMBEDDING_MODEL, contents=batch)
        embeddings.extend(e.values for e in response.embeddings)
    return embeddings
