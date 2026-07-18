import { RETENTION_DAYS } from "./dates";
import { AppSettings, Creator, EtlRun, Post, Topic } from "./types";

// Prototype seed data (#16/#17 are "wayfinder:prototype" tickets -- this
// stands in for real Supabase/BigQuery reads until a live project is wired up).

export const mockTopics: Topic[] = [
  { id: "topic-ai-agents", name: "AI Agents", is_active: true },
  { id: "topic-rust-lang", name: "Rust Lang", is_active: true },
  { id: "topic-web3", name: "Web3", is_active: false },
];

export const mockCreators: Creator[] = [
  { id: "c1", handle: "@sama", platform: "twitter", topic_id: "topic-ai-agents" },
  { id: "c2", handle: "r/LocalLLaMA", platform: "reddit", topic_id: "topic-ai-agents" },
  { id: "c3", handle: "@rustlang", platform: "twitter", topic_id: "topic-rust-lang" },
  { id: "c4", handle: "r/rust", platform: "reddit", topic_id: "topic-rust-lang" },
];

export const mockSettings: AppSettings = {
  twitter_auth_token: "",
  twitter_ct0: "",
  reddit_client_id: "",
  reddit_client_secret: "",
  reddit_user_agent: "Tweety/1.0",
  last_run_status: "Twitter Cookie Expired",
  last_run_at: "2026-07-18T01:12:00Z",
};

function daysAgo(n: number): string {
  const d = new Date("2026-07-18T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// One etl_runs row per day across the full Archive Horizon (ADR-0004), so the
// Archive Viewer's calendar has Reddit-Only badges to render for every month
// it can navigate to. Day 0 (today) and day 5 are degraded runs; the rest
// succeeded normally.
export const mockEtlRuns: EtlRun[] = Array.from({ length: RETENTION_DAYS }, (_, n) => {
  const date = daysAgo(n);
  if (n === 0) {
    return {
      id: `run-${n}`,
      run_date: date,
      started_at: `${date}T01:00:00Z`,
      finished_at: `${date}T01:12:00Z`,
      twitter_ok: false,
      reddit_ok: true,
      posts_scraped: 9,
      error_message: "Twitter Cookie Expired",
    };
  }
  if (n === 5) {
    return {
      id: `run-${n}`,
      run_date: date,
      started_at: `${date}T01:00:00Z`,
      finished_at: null,
      twitter_ok: false,
      reddit_ok: false,
      posts_scraped: null,
      error_message: "Timed out at 25-minute budget cap",
    };
  }
  return {
    id: `run-${n}`,
    run_date: date,
    started_at: `${date}T01:00:00Z`,
    finished_at: `${date}T01:14:00Z`,
    twitter_ok: true,
    reddit_ok: true,
    posts_scraped: 27 + (n % 8),
    error_message: null,
  };
});

// Settings' ETL Runs Panel only shows the last 7.
export const mockRecentEtlRuns: EtlRun[] = mockEtlRuns.slice(0, 7);

export const mockPosts: Post[] = [
  // Today (Reddit-Only Mode -- no Twitter posts, matching run-0 above).
  {
    post_id: "r1",
    topic_id: "topic-ai-agents",
    platform: "reddit",
    creator_handle: "r/LocalLLaMA",
    scraped_date: daysAgo(0),
    text: "Benchmarking the new open-weight agent models against GPT-4 class tools -- surprisingly close on tool-use tasks.",
    url: "https://reddit.com/r/LocalLLaMA/comments/r1",
    engagement_score: 100 * 0.7 + 42 * 0.3,
    score: 100,
    num_comments: 42,
  },
  {
    post_id: "r2",
    topic_id: "topic-rust-lang",
    platform: "reddit",
    creator_handle: "r/rust",
    scraped_date: daysAgo(0),
    text: "Async traits are finally stable-ish -- here's what changes for library authors.",
    url: "https://reddit.com/r/rust/comments/r2",
    engagement_score: 76 * 0.7 + 30 * 0.3,
    score: 76,
    num_comments: 30,
  },
  // Yesterday (full run, both platforms).
  {
    post_id: "t1",
    topic_id: "topic-ai-agents",
    platform: "twitter",
    creator_handle: "@sama",
    scraped_date: daysAgo(1),
    text: "Agents that can actually finish multi-step tasks unsupervised are closer than people think.",
    url: "https://twitter.com/sama/status/t1",
    engagement_score: 12000 * 0.4 + 3400 * 0.3 + 800 * 0.2 + 210 * 0.1,
    views: 12000,
    likes: 3400,
    reposts: 800,
    replies: 210,
  },
  {
    post_id: "r3",
    topic_id: "topic-ai-agents",
    platform: "reddit",
    creator_handle: "r/LocalLLaMA",
    scraped_date: daysAgo(1),
    text: "Ran a local agent loop for 6 hours straight -- here's what broke and what held up.",
    url: "https://reddit.com/r/LocalLLaMA/comments/r3",
    engagement_score: 88 * 0.7 + 51 * 0.3,
    score: 88,
    num_comments: 51,
  },
  {
    post_id: "t2",
    topic_id: "topic-rust-lang",
    platform: "twitter",
    creator_handle: "@rustlang",
    scraped_date: daysAgo(1),
    text: "The 2026 edition survey results are in -- async and const generics top the wishlist again.",
    url: "https://twitter.com/rustlang/status/t2",
    engagement_score: 9000 * 0.4 + 2100 * 0.3 + 640 * 0.2 + 95 * 0.1,
    views: 9000,
    likes: 2100,
    reposts: 640,
    replies: 95,
  },
];
