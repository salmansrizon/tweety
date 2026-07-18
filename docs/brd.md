# Business Requirements Document (BRD)
## Project: TopicRadar (Multi-Platform RAG Archive)

**Document Version:** 1.0
**Date:** October 2024
**Status:** Draft for Approval

---

## 1. Executive Summary
TopicRadar is a data aggregation and intelligence platform that autonomously tracks, scores, and archives high-engagement social media discourse across Twitter and Reddit. By leveraging a Retrieval-Augmented Generation (RAG) pipeline, the system transforms raw, unstructured social media posts into semantic, searchable knowledge clusters based on user-defined topics. The entire solution is architected to operate at zero infrastructure cost by utilizing free-tier services (GitHub Actions, BigQuery, Supabase, Vercel, OpenRouter, and LangChain).

## 2. Business Objectives & Success Metrics
**Objectives:**
1.  **Automate Intelligence Gathering:** Eliminate manual scrolling by automating the daily extraction of top-performing posts related to specific niches (e.g., "AI Agents", "Rust Lang").
2.  **Semantic Knowledge Retrieval:** Enable users to "chat" with historical social media data to identify trends, sentiments, and key arguments rather than just reading chronological feeds.
3.  **Zero-Cost Operations:** Maintain the entire pipeline and web presence without incurring SaaS or cloud computing fees.

**Success Metrics:**
*   **System Reliability:** ETL pipeline successfully completes >80% of scheduled runs without manual intervention (accounting for Twitter cookie degradation).
*   **Data Accuracy:** Scraped engagement metrics match live platform metrics at the time of extraction with >95% accuracy.
*   **RAG Relevance:** LangChain-generated summaries and Q&A answers successfully cite or reference retrieved context >90% of the time.

---

## 3. Project Scope

### 3.1 In-Scope
*   Web-based CMS for dynamic configuration of topics, platform-specific creators (Twitter handles, Reddit subreddits), and API credentials.
*   Automated daily ETL pipeline via GitHub Actions to scrape, score, and store data.
*   Dual-storage architecture: BigQuery for raw metrics/warehousing, Supabase pgvector for semantic text search.
*   LangChain-powered RAG API for generating daily summaries and answering natural language queries based on historical archives.
*   Web UI displaying a multi-day, filterable archive with a chat interface.

### 3.2 Out-of-Scope
*   Real-time or streaming data ingestion (system runs on a 24-hour batch cycle).
*   Scraping of multimedia content (images, videos, audio). Text and engagement metrics only.
*   Automated renewal of Twitter authentication cookies.
*   Automated posting, replying, or interacting with source platforms.

---

## 4. Functional Requirements

### FR-1: Configuration & Management (CMS)
*   **FR-1.1:** The system shall provide a secure, authenticated web interface for the user to manage system configuration.
*   **FR-1.2:** The user shall be able to Create, Read, Update, and Delete (CRUD) "Topics" (e.g., AI Agents).
*   **FR-1.3:** The user shall be able to assign multiple "Creators" to a Topic, specifying the source platform (`twitter` or `reddit`) and the handle/subreddit (e.g., `@sama` or `r/LocalLLaMA`).
*   **FR-1.4:** The system shall provide secure fields in the CMS to store and update Twitter session cookies (`auth_token`, `ct0`) and Reddit API credentials (`client_id`, `client_secret`).

### FR-2: Data Acquisition (ETL Pipeline)
*   **FR-2.1:** The system shall execute an automated batch job daily via GitHub Actions cron schedule.
*   **FR-2.2:** The pipeline shall dynamically fetch configuration data (Topics, Creators, Credentials) from Supabase at the start of each run.
*   **FR-2.3 (Twitter):** For Twitter creators, the system shall use Playwright to inject cookies, navigate to Twitter Advanced Search, and query posts matching the topic/handles from the last 24 hours.
*   **FR-2.4 (Reddit):** For Reddit creators, the system shall use the PRAW library to authenticate via OAuth and fetch the top 50 posts from the last 24 hours for the assigned subreddits.
*   **FR-2.5:** The system shall extract raw text, post URLs, timestamps, and engagement metrics (Views, Likes, Reposts, Replies for Twitter; Upvotes, Comments for Reddit).

### FR-3: Data Processing & Scoring
*   **FR-3.1:** The system shall filter out retweets/shared posts to ensure only original content is archived.
*   **FR-3.2:** The system shall calculate an `engagement_score` for every post using the following business logic:
    *   *Twitter:* `(Views * 0.4) + (Likes * 0.3) + (Reposts * 0.2) + (Replies * 0.1)`
    *   *Reddit:* `(Upvotes * 0.7) + (Comments * 0.3)`
*   **FR-3.3:** The system shall normalize text (e.g., combining Reddit Title + Body) and truncate to 2,000 tokens to prepare for embedding.

### FR-4: Storage & Vectorization
*   **FR-4.1:** The system shall insert raw post data, metrics, and calculated scores into Google BigQuery for long-term warehousing.
*   **FR-4.2:** The system shall generate vector embeddings for normalized post text using Google Gemini `text-embedding-004`.
*   **FR-4.3:** The system shall insert the text, metadata (topic, platform, date), and vector embedding into Supabase `post_vectors` table to enable semantic search.

### FR-5: RAG Pipeline & Intelligence (LangChain)
*   **FR-5.1:** The system shall utilize LangChain in the web application backend to orchestrate Retrieval-Augmented Generation.
*   **FR-5.2:** When a user requests a summary for a specific Topic and Date, LangChain shall perform a semantic similarity search against the Supabase vector database, retrieving the top 15 most relevant posts.
*   **FR-5.3:** LangChain shall construct a prompt injecting the retrieved posts as context, instructing the OpenRouter LLM to summarize key insights and distinguish between Twitter and Reddit sentiments.
*   **FR-5.4:** The system shall cache generated summaries in Supabase to prevent redundant LLM calls on subsequent page loads.
*   **FR-5.5 (Dynamic Q&A):** The user shall be able to input natural language questions via a Chat UI. LangChain will embed the query, retrieve matching context from Supabase, and generate an answer citing the specific source posts.

### FR-6: Archive Viewer UI
*   **FR-6.1:** The system shall provide a web interface displaying a multi-day archive.
*   **FR-6.2:** The UI shall feature a date picker and filtering checkboxes (Twitter, Reddit, Topic).
*   **FR-6.3:** The UI shall display the cached RAI-generated summary at the top of the feed, followed by chronological/score-sorted post cards displaying text, platform badge, engagement metrics, and source URL.

---

## 5. Business Rules & Constraints

### 5.1 Free-Tier Constraints (Zero Cost Mandate)
*   **Compute:** ETL must complete within 2,000 minutes/month on GitHub Actions.
*   **Storage (BigQuery):** BigQuery Sandbox mode is free but enforces a 60-day data expiration. Queries must be optimized to scan < 1TB/month.
*   **Storage (Supabase):** Database must remain under 500MB. Vector tables must be pruned if growth exceeds limits.
*   **AI APIs:** OpenRouter requests must target free-tier models (e.g., Llama-3-8B-Instruct) and handle `429 Rate Limit` errors with exponential backoff. Gemini Embedding requests must stay under 1,500/day.

### 5.2 Authentication & Security
*   Twitter cookies and Reddit API keys must be stored in the Supabase database. Access to the CMS and configuration settings must be gated behind Supabase Auth.
*   The web portal must not expose backend credentials to the client browser.

### 5.3 Error Handling & Maintenance
*   If Playwright detects a Twitter login wall (indicating cookie expiration), the ETL must abort the Twitter scraping phase, log the error to Supabase (`last_run_status = "Twitter Cookie Expired"`), and trigger a notification (via GitHub Actions email). The Reddit scraping phase should still proceed.

---

## 6. Assumptions & Risks

### 6.1 Assumptions
*   The user possesses a Twitter account and is willing to manually extract and update session cookies when they expire.
*   The user has created a Reddit account and registered a "Script" application to generate API credentials.
*   Google Cloud and BigQuery Sandbox access is available to the user.

### 6.2 Risks & Mitigations
| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Twitter DOM/Bot Detection Update** | High | High | Playwright selectors are modularized for quick updates. System degrades gracefully (continues Reddit scraping) if Twitter fails. |
| **Twitter Cookie Expiry** | Medium | High | CMS provides a fast UI for cookie updates. System alerts user immediately upon failed auth. |
| **Supabase 500MB Limit Reached** | Medium | Low | Implement a cleanup script in the ETL to delete vector embeddings older than 90 days (relying on BigQuery for raw text beyond that). |
| **OpenRouter Free Model Downtime** | Medium | Medium | LangChain configured with fallback models (e.g., if Llama 3 is down, try Gemini Flash free tier). |


```