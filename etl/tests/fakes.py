"""In-memory stand-ins for the Supabase, BigQuery, Gemini, and PRAW clients.

Used by the runner integration test to dry-run the full ETL orchestration
without live credentials. Not a full reimplementation of any real client --
just enough surface area for etl/runner.py's call patterns.
"""

from datetime import date, datetime


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    def __init__(self, rows: list[dict]):
        self._rows = rows
        self._filters = []
        self._mode = "select"
        self._payload = None
        self._single = False

    def select(self, *_args, **_kwargs):
        self._mode = "select"
        return self

    def eq(self, col, val):
        self._filters.append(lambda r: r.get(col) == val)
        return self

    def lt(self, col, val):
        self._filters.append(lambda r: r.get(col) < val)
        return self

    def in_(self, col, vals):
        self._filters.append(lambda r: r.get(col) in vals)
        return self

    def single(self):
        self._single = True
        return self

    def delete(self):
        self._mode = "delete"
        return self

    def insert(self, rows):
        self._mode = "insert"
        self._payload = rows if isinstance(rows, list) else [rows]
        return self

    def update(self, fields):
        self._mode = "update"
        self._payload = fields
        return self

    def _matching(self):
        return [r for r in self._rows if all(f(r) for f in self._filters)]

    def execute(self):
        if self._mode == "select":
            matched = self._matching()
            return _FakeResult(matched[0] if self._single and matched else matched)
        if self._mode == "insert":
            self._rows.extend(self._payload)
            return _FakeResult(self._payload)
        if self._mode == "delete":
            matched = self._matching()
            self._rows[:] = [r for r in self._rows if r not in matched]
            return _FakeResult(matched)
        if self._mode == "update":
            matched = self._matching()
            for r in matched:
                r.update(self._payload)
            return _FakeResult(matched)
        raise ValueError(f"Unhandled fake query mode: {self._mode}")


class FakeSupabaseClient:
    def __init__(self):
        self.store: dict[str, list[dict]] = {}

    def table(self, name: str) -> _FakeQuery:
        return _FakeQuery(self.store.setdefault(name, []))


class _FakeQueryJob:
    def result(self):
        return self


class FakeBigQueryClient:
    def __init__(self):
        self.rows: list[dict] = []

    def insert_rows_json(self, _table, rows):
        self.rows.extend(rows)
        return []  # no insert errors

    def query(self, sql, job_config=None):
        # The real bigquery.QueryJobConfig round-trips parameters through its wire
        # format, so DATE/TIMESTAMP params come back as date/datetime objects here,
        # not the strings that were originally passed in.
        params = {p.name: p.value for p in (job_config.query_parameters if job_config else [])}
        if "DATE(scraped_at) = @today" in sql:
            today: date = params["today"]
            self.rows = [r for r in self.rows if not r["scraped_at"].startswith(today.isoformat())]
        elif "scraped_at < @cutoff" in sql:
            cutoff: datetime = params["cutoff"]
            self.rows = [r for r in self.rows if datetime.fromisoformat(r["scraped_at"]) >= cutoff]
        else:
            raise ValueError(f"Unhandled fake query: {sql}")
        return _FakeQueryJob()


class _FakeEmbedding:
    def __init__(self, values):
        self.values = values


class _FakeEmbedResponse:
    def __init__(self, embeddings):
        self.embeddings = embeddings


class _FakeModels:
    def embed_content(self, model, contents):
        return _FakeEmbedResponse([_FakeEmbedding([0.1] * 768) for _ in contents])


class FakeGeminiClient:
    def __init__(self):
        self.models = _FakeModels()


class _FakeSubmission:
    def __init__(self, id, created_utc, title, selftext, score, num_comments, permalink):
        self.id = id
        self.created_utc = created_utc
        self.title = title
        self.selftext = selftext
        self.score = score
        self.num_comments = num_comments
        self.permalink = permalink


class _FakeSubreddit:
    def __init__(self, submissions: list[_FakeSubmission]):
        self._submissions = submissions

    def top(self, time_filter="day", limit=50):
        return iter(self._submissions[:limit])


class FakeRedditClient:
    def __init__(self, subreddits: dict[str, list[_FakeSubmission]]):
        self._subreddits = subreddits

    def subreddit(self, name: str) -> _FakeSubreddit:
        return _FakeSubreddit(self._subreddits.get(name, []))


class _FakeLocator:
    def __init__(self, count: int):
        self._count = count

    def count(self) -> int:
        return self._count


class FakeLoginWallTwitterPage:
    """Simulates a Playwright Page permanently showing a Twitter login wall."""

    def goto(self, _url):
        return None

    def locator(self, selector: str) -> _FakeLocator:
        if selector == '[data-testid="primaryColumn"]':
            return _FakeLocator(0)
        if selector == "text=Log in":
            return _FakeLocator(1)
        return _FakeLocator(0)
