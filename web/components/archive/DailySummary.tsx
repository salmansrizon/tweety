"use client";

import { useEffect, useState } from "react";

interface DailySummaryProps {
  topicId: string;
  topicName: string;
  date: string;
}

interface RagResponse {
  answer: string;
  cached: boolean;
  sources: { postId: string; platform: string; url?: string }[];
}

type State =
  | { status: "loading" }
  | { status: "ready"; data: RagResponse }
  | { status: "error"; error: string };

export function DailySummary({ topicId, topicName, date }: DailySummaryProps) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch("/api/rag-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, date }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        return res.json() as Promise<RagResponse>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [topicId, date]);

  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <div className="mb-1 flex items-center justify-between text-xs text-white/40">
        <span>RAG summary — {topicName}</span>
        {state.status === "ready" && state.data.cached && <span>cached</span>}
      </div>
      {state.status === "loading" && <p className="text-white/50">Analyzing archive via LangChain RAG…</p>}
      {state.status === "error" && (
        <p className="text-white/50">
          Summary unavailable ({state.error}). Configure Supabase/Gemini/OpenRouter credentials to enable RAG.
        </p>
      )}
      {state.status === "ready" && <p className="text-white/90">{state.data.answer}</p>}
    </div>
  );
}
