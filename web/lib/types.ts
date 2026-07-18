export type Platform = "twitter" | "reddit";

export interface Topic {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Creator {
  id: string;
  handle: string; // "@sama" or "r/LocalLLaMA"
  platform: Platform;
  topic_id: string;
}

export interface AppSettings {
  twitter_auth_token: string;
  twitter_ct0: string;
  reddit_client_id: string;
  reddit_client_secret: string;
  reddit_user_agent: string;
  last_run_status: string;
  last_run_at: string; // ISO timestamp
}

export interface EtlRun {
  id: string;
  run_date: string; // YYYY-MM-DD
  started_at: string;
  finished_at: string | null;
  twitter_ok: boolean | null;
  reddit_ok: boolean | null;
  posts_scraped: number | null;
  error_message: string | null;
}

export interface Post {
  post_id: string;
  topic_id: string;
  platform: Platform;
  creator_handle: string;
  scraped_date: string; // YYYY-MM-DD
  text: string;
  url: string;
  engagement_score: number;
  // Twitter metrics
  views?: number;
  likes?: number;
  reposts?: number;
  replies?: number;
  // Reddit metrics
  score?: number;
  num_comments?: number;
}
