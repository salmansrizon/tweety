# PRD: TopicRadar (Multi-Platform Scraper & RAG Archive CMS)

**Version:** 2.0 (Unified)
**Status:** Approved for Development
**Constraint:** 100% Free-Tier Architecture

## 1. Executive Summary
TopicRadar is a serverless, zero-cost data pipeline and web application that automatically scrapes high-impression posts from specific creators on Twitter and Reddit based on user-defined topics. It leverages Playwright and PRAW for data collection, OpenRouter and Google Gemini for AI processing, BigQuery for data warehousing, and Supabase + LangChain for a Retrieval-Augmented Generation (RAG) archive. The system is scheduled via GitHub Actions and features a Next.js CMS for dynamic configuration and multi-day semantic querying.

## 2. Goals & Non-Goals

### Goals
*   **Dynamic Multi-Platform Configuration:** Allow users to add/remove topics and assign Twitter handles or Reddit subreddits via a Web Portal.
*   **24-Hour Scraping:** Scrape top posts from the last 24 hours using Playwright (Twitter) and PRAW (Reddit).
*   **LangChain RAG Pipeline:** Use LangChain to orchestrate semantic retrieval of archived posts, providing context-aware summaries and dynamic Q&A.
*   **Multi-Day Archive:** Store historical data in BigQuery (metrics) and Supabase pgvector (text/vectors), rendering it in a filterable UI.
*   **Zero Cost:** Operate entirely within the free tiers of GitHub Actions, Supabase, BigQuery, Vercel, OpenRouter, and Google Gemini.

### Non-Goals
*   Real-time streaming of posts.
*   Scraping media (images/videos) – text and engagement metrics only.
*   Automated Twitter cookie refreshing (user must manually update via CMS).
*   Interacting with platforms (liking, posting, commenting).

---

## 3. System Architecture

### 3.1 Architecture Diagram
```text
┌──────────────────────────────────────────────────────────┐
│               Web Portal (Next.js / Vercel)              │
│  ┌───────────────┐  ┌─────────────────────────────────┐  │
│  │  CMS Admin UI │  │  Archive UI & RAG Chat Interface│  │
│  └───────┬───────┘  └───────┬─────────────────────────┘  │
└──────────┼──────────────────┼────────────────────────────┘
           │ Config (Write)   │ LangChain RAG (Read/Query)
           ▼                  ▼
┌────────────────────┐  ┌──────────────────────────────────┐
│  Supabase (Postgres│  │  LangChain Orchestrator (Next.js)│
│  + pgvector)       │  │  - Vector Store Retriever        │
│  - Topics/Creatrs  │  │  - Contextualization             │
│  - Platform Tokens │  │  - OpenRouter LLM Integration    │
│  - Post Vectors    │  └──────────────▲───────────────────┘
└──────────▲─────────┘                 │ Retrieves Context
           │ Fetches Config             │ 
           │                       ┌────┴───────────────────┐
           │                       │  BigQuery (Sandbox)    │
           │                       │  - Raw Posts & Metrics │
           │                       │  - Partitioned by day  │
┌──────────┴───────────────────────┴────────────────────────┐
│         GitHub Actions (Cron ETL - Free Tier)             │
│  ┌─────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐  │
│  │ Fetcher │──►│ Scrapers  │──►│Scorer & │──►│Embedder │  │
│  │ Config  │   │ (PW/PRAW) │   │Filterer │   │(Gemini) │  │
│  └─────────┘   └───────────┘   └─────────┘   └────┬────┘  │
│                                                   │       │
│                                             Pushes to BQ │
│                                             & Supabase   │
└───────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack
*   **Frontend/CMS:** Next.js 14 (App Router), TailwindCSS, hosted on Vercel.
*   **Config DB & Vector Store:** Supabase (Postgres + `pgvector`).
*   **Data Warehouse:** Google BigQuery (Sandbox Mode).
*   **ETL Engine:** Python 3.11, running on GitHub Actions.
*   **Scraping Engines:** Playwright (Python) for Twitter, PRAW for Reddit.
*   **RAG Framework:** LangChain.js (for Next.js backend API routes).
*   **AI Providers:** Google Gemini (`text-embedding-004` for embeddings) & OpenRouter (free LLMs for generation).

---

## 4. Data Models

### 4.1 Supabase Schema (Configuration & Vectors)
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Configuration Tables
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,         -- e.g., "@elonmusk" or "r/MachineLearning"
  platform TEXT NOT NULL,       -- 'twitter' or 'reddit'
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  twitter_auth_token TEXT,
  twitter_ct0 TEXT,
  reddit_client_id TEXT,
  reddit_client_secret TEXT,
  reddit_user_agent TEXT DEFAULT 'TopicRadar/1.0',
  last_run_status TEXT,
  last_run_at TIMESTAMPTZ
);

-- Vector Table for LangChain RAG
CREATE TABLE post_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT UNIQUE NOT NULL, -- Twitter Tweet ID or Reddit Post ID
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  scraped_date DATE NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(768) -- Dimension size for Gemini text-embedding-004
);

-- Index for fast cosine similarity searches
CREATE INDEX ON post_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 4.2 BigQuery Schema (Raw Archive & Metrics)
```sql
CREATE TABLE archive.posts (
  post_id STRING,
  topic_id STRING,
  topic_name STRING,
  platform STRING,
  creator_handle STRING,
  posted_at TIMESTAMP,
  scraped_at TIMESTAMP,
  text STRING,
  url STRING,
  views INT64,       -- NULL for Reddit
  likes INT64,       -- NULL for Reddit (uses score)
  reposts INT64,     -- NULL for Reddit
  replies INT64,
  score INT64,       -- Reddit upvotes
  num_comments INT64,-- Reddit comments
  engagement_score FLOAT64,
  is_top_post BOOLEAN
) PARTITION BY DATE(scraped_at)
  CLUSTER BY topic_name, platform;
```

---

## 5. Functional Requirements

### 5.1 CMS Configuration Portal (Supabase + Next.js)
*   **Authentication:** Secure login via Supabase Auth.
*   **Topic & Creator Management:** UI to CRUD topics and assign platform-specific handles (Twitter `@` or Reddit `r/`).
*   **Credential Management:** Secure forms to input/update Twitter cookies and Reddit API keys.
*   **Archive Viewer:** Calendar component to select past dates. Sidebar to filter by Topic and Platform.
*   **RAG Chat Interface:** A chat input at the bottom of the UI to ask semantic questions about the filtered archive (e.g., "What were the main arguments about Rust's memory safety?").

### 5.2 ETL Pipeline (GitHub Actions)
*   **Scheduling:** Cron trigger running once every 24 hours.
*   **Config Fetching:** Python script queries Supabase for active topics, creators, and platform credentials.
*   **Twitter Scraping (Playwright):**
    *   Inject cookies. Navigate to Advanced Search: `(from:handle1 OR from:handle2) "topic" since:YYYY-MM-DD`.
    *   Extract: ID, Handle, Timestamp, Text, Views, Likes, Reposts, Replies.
*   **Reddit Scraping (PRAW):**
    *   Authenticate via PRAW. Fetch top posts from 24h for assigned subreddits.
    *   Extract: ID, Author, Title, Body, URL, Score (Upvotes), Comments.
*   **Cross-Platform Scoring:**
    ```python
    def calculate_score(platform, metrics):
        if platform == 'twitter':
            return (metrics['views'] * 0.4) + (metrics['likes'] * 0.3) + (metrics['reposts'] * 0.2) + (metrics['replies'] * 0.1)
        elif platform == 'reddit':
            return (metrics['score'] * 0.7) + (metrics['num_comments'] * 0.3)
    ```
*   **Data Ingestion:** Insert raw metrics into BigQuery. Insert text + metadata into Supabase `post_vectors`.

### 5.3 Embedding Generation (ETL Phase)
*   Before inserting into Supabase, the Python ETL sends normalized text to Google Gemini Embedding API (`text-embedding-004`).
*   Text normalization formats Reddit posts as `"Title: [title]. Body: [body]"` and truncates to 2,000 tokens to respect free-tier limits.

---

## 6. LangChain RAG Pipeline Integration

### 6.1 Why LangChain?
LangChain acts as the orchestration layer in the Next.js backend. It abstracts the connection between the Supabase Vector Store, the Prompt formatting, and the OpenRouter LLM, making it trivial to swap models or add conversational memory later.

### 6.2 RAG Retrieval & Summarization Flow (Next.js API Route)
When a user views a Topic for a specific Date, or asks a question in the Chat UI, the Next.js backend initiates the LangChain pipeline:

1.  **Vector Store Setup:** LangChain uses `SupabaseVectorStore` from `@langchain/community/vectorstores/supabase`, configured with the Google Gemini embeddings client.
2.  **Semantic Search:** LangChain performs a similarity search on the `post_vectors` table, filtered by `topic_id` and `scraped_date` via Supabase metadata filtering.
3.  **Context Retrieval:** Retrieves the top 15 most semantically relevant posts from Supabase. (Optional: fetches full metrics for these post IDs from BigQuery).
4.  **LLM Synthesis:** LangChain constructs a prompt using `ChatPromptTemplate`:
    > *"You are an expert analyst. Based on the following retrieved social media posts, answer the user's query. Note if the sentiment differs between Twitter (breaking news) and Reddit (deep dives). Context: [Retrieved Posts]. User Query: [Query]"*
5.  **Generation:** LangChain sends the prompt to `ChatOpenAI` configured to point to OpenRouter's free LLM endpoint (e.g., `meta-llama/llama-3-8b-instruct:free`).
6.  **Caching:** The generated summary is saved to Supabase as a cached daily summary to minimize API calls for future page loads.

### 6.3 LangChain.js Code Architecture (Conceptual)
```typescript
// Next.js API Route: /api/rag-query
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { createSupabaseClient } from "@/lib/supabase";

export async function POST(req) {
  const { topicId, date, userQuery } = await req.json();

  // 1. Initialize Embeddings (Free Google Gemini)
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "embedding-004",
  });

  // 2. Initialize Supabase Vector Store with metadata filters
  const vectorStore = await SupabaseVectorStore.fromExistingIndex(
    embeddings,
    {
      client: createSupabaseClient(),
      tableName: "post_vectors",
      filter: { topic_id: topicId, scraped_date: date }, // RAG metadata filtering
    }
  );

  // 3. Initialize OpenRouter LLM (via ChatOpenAI compatibility)
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    modelName: "meta-llama/llama-3-8b-instruct:free",
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });

  // 4. LangChain RetrievalQA Chain
  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(15));
  
  // 5. Execute RAG
  const response = await chain.call({ query: userQuery });
  return Response.json({ answer: response.text });
}
```

---

## 7. Operational Constraints & Free Tier Limits

| Component | Free Tier Limit | Expected Usage per Month | Risk Level |
| :--- | :--- | :--- | :--- |
| **GitHub Actions** | 2,000 mins/month (Private Repo) | ~200 mins (Scraping + Embeddings) | Low |
| **BigQuery** | 10GB Storage, 1TB Query/mo (60-day expiry) | < 100MB Storage, < 5GB Queries | Low |
| **Supabase** | 500MB DB, Paused after 1 week inactivity | < 50MB (Vectors + Config) | Medium |
| **Vercel** | 100GB Bandwidth, Serverless Function limits | < 10GB Bandwidth | Low |
| **Google Gemini** | 1,500 Embedding requests/day | ~50-100 requests/day | Low |
| **OpenRouter** | Free model rate limits (20 req/min) | ~30 requests/day (cached) | Medium |
| **Twitter/X** | Aggressive bot detection / Cookie expiry | Continuous manual maintenance | **High** |
| **Reddit API** | 100 requests per minute (OAuth) | ~10 requests/day | Low |

---

need to optimize bucasue i have another 30 min github action booked for my another project. need to share the space

## 8. User Experience (UX) Flow

1.  **Setup:** User logs into Web Portal. Configures Twitter cookies and Reddit API keys. Creates Topic "AI Agents", assigns Twitter `[@sama]` and Reddit `r/LocalLLaMA`.
2.  **Daily ETL Run:** GitHub Actions spins up at 6 AM. Python scrapes both platforms for the last 24h, scores posts, generates Gemini embeddings, and saves to Supabase + BigQuery.
3.  **Viewing Archive:** User opens the Web Portal next morning. Selects "Yesterday" and "AI Agents".
4.  **RAG Summary Load:** UI shows "Analyzing archive via LangChain RAG...". The Next.js backend queries Supabase vectors, retrieves context, asks OpenRouter for a summary, and displays a 3-bullet semantic summary distinguishing between Twitter takes and Reddit discussions.
5.  **Dynamic Q&A:** User types in the chat: *"Were there any arguments about context window sizes?"* LangChain embeds the question, retrieves specific Reddit posts about context windows, and streams an answer citing the specific post URLs and platforms.
```