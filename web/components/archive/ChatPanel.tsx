"use client";

import { useState } from "react";
import { Topic } from "@/lib/types";

interface ChatPanelProps {
  topics: Topic[];
  date: string;
}

interface Source {
  postId: string;
  platform: string;
  url?: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

export function ChatPanel({ topics, date }: ChatPanelProps) {
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || !topicId || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/rag-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, date, userQuery: query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, sources: data.sources }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Sorry, that failed: ${err instanceof Error ? err.message : String(err)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (topics.length === 0) return null;

  return (
    <div className="mt-8 rounded-md border border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Ask about this archive</h3>
        {topics.length > 1 && (
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-white/40">
            e.g. &quot;Were there any arguments about context window sizes?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] rounded-md px-3 py-2 text-left text-sm ${
                m.role === "user" ? "bg-white text-black" : "bg-white/10 text-white/90"
              }`}
            >
              {m.text}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-2 text-xs text-white/50">
                  {m.sources.map((s) =>
                    s.url ? (
                      <a
                        key={s.postId}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white"
                      >
                        {s.platform}:{s.postId}
                      </a>
                    ) : (
                      <span key={s.postId}>
                        {s.platform}:{s.postId}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-white/40">Thinking…</p>}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this archive..."
          className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
