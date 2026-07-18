"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/archive/Calendar";
import { PostCard } from "@/components/archive/PostCard";
import { toISODate } from "@/lib/dates";
import { mockEtlRuns, mockPosts, mockTopics } from "@/lib/mock-data";
import { Platform } from "@/lib/types";

const ALL_PLATFORMS: Platform[] = ["twitter", "reddit"];

export default function ArchivePage() {
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(mockTopics.map((t) => t.id));
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(ALL_PLATFORMS);

  const runForDate = mockEtlRuns.find((r) => r.run_date === selectedDate);
  const isRedditOnly = runForDate?.twitter_ok === false;

  const posts = useMemo(
    () =>
      mockPosts
        .filter(
          (p) =>
            p.scraped_date === selectedDate &&
            selectedTopicIds.includes(p.topic_id) &&
            selectedPlatforms.includes(p.platform),
        )
        .sort((a, b) => b.engagement_score - a.engagement_score),
    [selectedDate, selectedTopicIds, selectedPlatforms],
  );

  function toggleTopic(id: string) {
    setSelectedTopicIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <Calendar selectedDate={selectedDate} onSelect={setSelectedDate} etlRuns={mockEtlRuns} />

        <div className="mt-6">
          <h3 className="mb-2 text-xs font-medium uppercase text-white/40">Topics</h3>
          <div className="flex flex-col gap-1">
            {mockTopics.map((topic) => (
              <label key={topic.id} className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={selectedTopicIds.includes(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                />
                {topic.name}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-xs font-medium uppercase text-white/40">Platform</h3>
          <div className="flex flex-col gap-1">
            {ALL_PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                />
                {platform === "twitter" ? "Twitter" : "Reddit"}
              </label>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <h1 className="text-lg font-semibold">Archive — {selectedDate}</h1>

        {isRedditOnly && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Reddit-Only Mode — Twitter scraping was unavailable on this day. Showing Reddit posts only.
          </div>
        )}

        <div className="mt-4 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
          RAG summary coming soon — this banner will show an AI-generated summary of the day&apos;s
          posts once the RAG chat pipeline (#18) is wired up.
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {posts.length === 0 && <p className="text-sm text-white/40">No posts for this selection.</p>}
          {posts.map((post) => (
            <PostCard key={post.post_id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
}
