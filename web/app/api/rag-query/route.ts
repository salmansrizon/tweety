import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SUMMARY_QUERY, generateAnswer, retrieveContext } from "@/lib/rag";

function supabaseServerClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const topicId: string | undefined = body?.topicId;
  const date: string | undefined = body?.date;
  const userQuery: string | undefined = body?.userQuery;

  if (!topicId || !date) {
    return NextResponse.json({ error: "topicId and date are required" }, { status: 400 });
  }

  try {
    const supabase = supabaseServerClient();
    const isDailySummary = !userQuery;

    // FR-5.4: cache the daily auto-summary (not ad-hoc chat Q&A, which naturally varies per question).
    if (isDailySummary) {
      const { data: cached } = await supabase
        .from("rag_summaries")
        .select("summary")
        .eq("topic_id", topicId)
        .eq("scraped_date", date)
        .maybeSingle();

      if (cached) {
        return NextResponse.json({ answer: cached.summary, cached: true, sources: [] });
      }
    }

    const query = userQuery ?? DEFAULT_SUMMARY_QUERY;
    const posts = await retrieveContext(supabase, topicId, date, query);
    const answer = await generateAnswer(posts, query);

    if (isDailySummary) {
      await supabase
        .from("rag_summaries")
        .upsert({ topic_id: topicId, scraped_date: date, summary: answer }, { onConflict: "topic_id,scraped_date" });
    }

    const sources = posts.map((p) => ({ postId: p.postId, platform: p.platform, url: p.url }));
    return NextResponse.json({ answer, cached: false, sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : "RAG query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
