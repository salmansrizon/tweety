"use client";

import { useState } from "react";
import { mockTopics } from "@/lib/mock-data";
import { Topic } from "@/lib/types";

let nextId = mockTopics.length + 1;

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>(mockTopics);
  const [name, setName] = useState("");

  function addTopic(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setTopics((prev) => [...prev, { id: `topic-${nextId++}`, name: trimmed, is_active: true }]);
    setName("");
  }

  function toggleActive(id: string) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t)));
  }

  function deleteTopic(id: string) {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold">Topics</h1>
      <p className="mt-1 text-sm text-white/60">
        A Topic groups one or more Creators. Inactive Topics are skipped by the ETL.
      </p>

      <form onSubmit={addTopic} className="mt-6 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New topic name, e.g. AI Agents"
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
        {topics.length === 0 && (
          <li className="p-4 text-sm text-white/50">No topics yet -- add one above.</li>
        )}
        {topics.map((topic) => (
          <li key={topic.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${topic.is_active ? "bg-emerald-400" : "bg-white/20"}`}
                title={topic.is_active ? "Active" : "Inactive"}
              />
              <span className="text-sm">{topic.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleActive(topic.id)}
                className="text-xs text-white/60 hover:text-white"
              >
                {topic.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => deleteTopic(topic.id)}
                className="text-xs text-red-400/80 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
