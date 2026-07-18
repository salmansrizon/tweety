"use client";

import { useState } from "react";
import { mockRecentEtlRuns, mockSettings } from "@/lib/mock-data";

function StatusIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-white/30">–</span>;
  return ok ? (
    <span className="text-emerald-400" title="OK">
      ✓
    </span>
  ) : (
    <span className="text-red-400" title="Failed">
      ✗
    </span>
  );
}

export default function SettingsPage() {
  const [twitterAuthToken, setTwitterAuthToken] = useState(mockSettings.twitter_auth_token);
  const [twitterCt0, setTwitterCt0] = useState(mockSettings.twitter_ct0);
  const [redditClientId, setRedditClientId] = useState(mockSettings.reddit_client_id);
  const [redditClientSecret, setRedditClientSecret] = useState(mockSettings.reddit_client_secret);
  const [saved, setSaved] = useState(false);

  const twitterExpired = mockSettings.last_run_status === "Twitter Cookie Expired";

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Prototype: persists to Supabase app_settings (server-only) once wired.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold">Settings</h1>

      {twitterExpired && (
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Twitter authentication is currently expired. Update your session cookies below so the
          next ETL run can resume Twitter scraping.
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-6">
        <fieldset className="rounded-md border border-white/10 p-4">
          <legend className="px-1 text-sm font-medium">Twitter cookies</legend>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="auth_token" className="mb-1 block text-sm text-white/70">
                auth_token
              </label>
              <input
                id="auth_token"
                type="password"
                value={twitterAuthToken}
                onChange={(e) => setTwitterAuthToken(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label htmlFor="ct0" className="mb-1 block text-sm text-white/70">
                ct0
              </label>
              <input
                id="ct0"
                type="password"
                value={twitterCt0}
                onChange={(e) => setTwitterCt0(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-white/10 p-4">
          <legend className="px-1 text-sm font-medium">Reddit API keys</legend>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="reddit_client_id" className="mb-1 block text-sm text-white/70">
                Client ID
              </label>
              <input
                id="reddit_client_id"
                type="text"
                value={redditClientId}
                onChange={(e) => setRedditClientId(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label htmlFor="reddit_client_secret" className="mb-1 block text-sm text-white/70">
                Client Secret
              </label>
              <input
                id="reddit_client_secret"
                type="password"
                value={redditClientSecret}
                onChange={(e) => setRedditClientSecret(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          {saved ? "Saved" : "Save credentials"}
        </button>
      </form>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-white/80">ETL Runs (last 7)</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="px-4 py-2 font-normal">Date</th>
                <th className="px-4 py-2 font-normal">Twitter</th>
                <th className="px-4 py-2 font-normal">Reddit</th>
                <th className="px-4 py-2 font-normal">Posts</th>
                <th className="px-4 py-2 font-normal">Error</th>
              </tr>
            </thead>
            <tbody>
              {mockRecentEtlRuns.map((run) => (
                <tr key={run.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2">{run.run_date}</td>
                  <td className="px-4 py-2">
                    <StatusIcon ok={run.twitter_ok} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusIcon ok={run.reddit_ok} />
                  </td>
                  <td className="px-4 py-2">{run.posts_scraped ?? "–"}</td>
                  <td className="px-4 py-2 text-white/50">{run.error_message ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
