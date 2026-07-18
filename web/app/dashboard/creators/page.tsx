"use client";

import { useMemo, useState } from "react";
import { mockCreators, mockTopics } from "@/lib/mock-data";
import { Creator, Platform } from "@/lib/types";

let nextId = mockCreators.length + 1;

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>(mockCreators);
  const [topicId, setTopicId] = useState(mockTopics[0]?.id ?? "");
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [handle, setHandle] = useState("");

  const creatorsForTopic = useMemo(
    () => creators.filter((c) => c.topic_id === topicId),
    [creators, topicId],
  );

  function addCreator(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = handle.trim();
    if (!trimmed || !topicId) return;
    setCreators((prev) => [
      ...prev,
      { id: `creator-${nextId++}`, handle: trimmed, platform, topic_id: topicId },
    ]);
    setHandle("");
  }

  function deleteCreator(id: string) {
    setCreators((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold">Creators</h1>
      <p className="mt-1 text-sm text-white/60">
        Assign Twitter handles or Reddit subreddits to a Topic.
      </p>

      <div className="mt-6">
        <label htmlFor="topic" className="mb-1 block text-sm text-white/70">
          Topic
        </label>
        <select
          id="topic"
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
        >
          {mockTopics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={addCreator} className="mt-4 flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
        >
          <option value="twitter">Twitter</option>
          <option value="reddit">Reddit</option>
        </select>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={platform === "twitter" ? "@handle" : "r/subreddit"}
          className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          Add
        </button>
      </form>

      <ul className="mt-6 flex flex-col divide-y divide-white/10 rounded-md border border-white/10">
        {creatorsForTopic.length === 0 && (
          <li className="p-4 text-sm text-white/50">No creators for this topic yet.</li>
        )}
        {creatorsForTopic.map((creator) => (
          <li key={creator.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/60">
                {creator.platform}
              </span>
              <span className="text-sm">{creator.handle}</span>
            </div>
            <button
              onClick={() => deleteCreator(creator.id)}
              className="text-xs text-red-400/80 hover:text-red-400"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
