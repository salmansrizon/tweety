# ADR-0003: Use OpenRouter free model router for LLM generation

**Date:** 2026-07-18
**Status:** Accepted

---

## Context

Tweety's RAG pipeline needs an LLM for synthesis. The system must stay within free-tier limits. OpenRouter provides a special **free model router endpoint** that automatically selects an available free model from its pool, handling routing and fallback transparently.

## Decision

Use OpenRouter's **free model router endpoint** as the sole LLM integration point:

```
model: "openrouter/auto"   # or equivalent free-router slug
baseURL: "https://openrouter.ai/api/v1"
```

No specific model name is hard-coded. No application-level fallback chain is needed — OpenRouter handles availability internally.

## Alternatives considered

- **Hard-coded model + exponential backoff only** — rejected: fragile, single point of failure if the specific model is down.
- **Hard-coded primary + manual fallback chain in LangChain** — rejected: unnecessary complexity; OpenRouter's router already does this better at the infrastructure level.

## Consequences

- Tweety's LangChain integration points to one endpoint with one API key — simpler code.
- Response quality may vary across runs depending on which free model OpenRouter selects. This is acceptable for a zero-cost system.
- If OpenRouter's free tier changes pricing or availability, this ADR should be revisited.
