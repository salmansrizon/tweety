import { AppSettings, Creator, EtlRun, Topic } from "./types";

// Prototype seed data (#16/#17 are "wayfinder:prototype" tickets -- this
// stands in for real Supabase reads until a live project is wired up).

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

export const mockEtlRuns: EtlRun[] = [
  {
    id: "run-0",
    run_date: daysAgo(0),
    started_at: `${daysAgo(0)}T01:00:00Z`,
    finished_at: `${daysAgo(0)}T01:12:00Z`,
    twitter_ok: false,
    reddit_ok: true,
    posts_scraped: 18,
    error_message: "Twitter Cookie Expired",
  },
  {
    id: "run-1",
    run_date: daysAgo(1),
    started_at: `${daysAgo(1)}T01:00:00Z`,
    finished_at: `${daysAgo(1)}T01:14:00Z`,
    twitter_ok: true,
    reddit_ok: true,
    posts_scraped: 34,
    error_message: null,
  },
  {
    id: "run-2",
    run_date: daysAgo(2),
    started_at: `${daysAgo(2)}T01:00:00Z`,
    finished_at: `${daysAgo(2)}T01:13:00Z`,
    twitter_ok: true,
    reddit_ok: true,
    posts_scraped: 31,
    error_message: null,
  },
  {
    id: "run-3",
    run_date: daysAgo(3),
    started_at: `${daysAgo(3)}T01:00:00Z`,
    finished_at: `${daysAgo(3)}T01:15:00Z`,
    twitter_ok: true,
    reddit_ok: true,
    posts_scraped: 29,
    error_message: null,
  },
  {
    id: "run-4",
    run_date: daysAgo(4),
    started_at: `${daysAgo(4)}T01:00:00Z`,
    finished_at: `${daysAgo(4)}T01:11:00Z`,
    twitter_ok: true,
    reddit_ok: true,
    posts_scraped: 33,
    error_message: null,
  },
  {
    id: "run-5",
    run_date: daysAgo(5),
    started_at: `${daysAgo(5)}T01:00:00Z`,
    finished_at: null,
    twitter_ok: false,
    reddit_ok: false,
    posts_scraped: null,
    error_message: "Timed out at 25-minute budget cap",
  },
  {
    id: "run-6",
    run_date: daysAgo(6),
    started_at: `${daysAgo(6)}T01:00:00Z`,
    finished_at: `${daysAgo(6)}T01:16:00Z`,
    twitter_ok: true,
    reddit_ok: true,
    posts_scraped: 27,
    error_message: null,
  },
];
