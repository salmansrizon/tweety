import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseClient } from "@supabase/supabase-js";

export const TOP_K = 15;

export const DEFAULT_SUMMARY_QUERY =
  "Summarize the key themes, arguments, and sentiment across today's posts for this topic. Note if the sentiment differs between Twitter (breaking news) and Reddit (deep dives).";

const PROMPT = ChatPromptTemplate.fromTemplate(
  `You are an expert analyst. Based on the following retrieved social media posts, answer the user's query. Note if the sentiment differs between Twitter (breaking news) and Reddit (deep dives).

Context:
{context}

User Query: {query}`,
);

export interface RetrievedPost {
  postId: string;
  platform: string;
  url?: string;
  text: string;
}

function buildEmbeddings() {
  // Must match etl/embedder.py's EMBEDDING_MODEL exactly -- query and stored
  // vectors have to live in the same embedding space for similarity search
  // to mean anything.
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });
}

function buildModel() {
  return new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: "openrouter/auto",
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });
}

export async function retrieveContext(
  supabase: SupabaseClient,
  topicId: string,
  scrapedDate: string,
  query: string,
): Promise<RetrievedPost[]> {
  const vectorStore = new SupabaseVectorStore(buildEmbeddings(), {
    client: supabase,
    tableName: "post_vectors",
    queryName: "match_post_vectors",
  });

  const docs = await vectorStore.similaritySearch(query, TOP_K, {
    topic_id: topicId,
    scraped_date: scrapedDate,
  });

  return docs.map((d) => ({
    postId: String(d.metadata.post_id),
    platform: String(d.metadata.platform),
    url: d.metadata.url ? String(d.metadata.url) : undefined,
    text: d.pageContent,
  }));
}

function formatContext(posts: RetrievedPost[]): string {
  return posts
    .map((p) => `[${p.platform}] ${p.text}${p.url ? ` (${p.url})` : ""}`)
    .join("\n\n");
}

// OpenRouter's free tier rate-limits at 20 req/min; a single retry after a
// short backoff is enough for the occasional 429 without adding real
// complexity (ADR-0003, PRD §7).
async function withRetryOn429<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { status?: number; response?: { status?: number } })?.status
      ?? (err as { response?: { status?: number } })?.response?.status;
    if (status === 429 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return withRetryOn429(fn, retries - 1);
    }
    throw err;
  }
}

export async function generateAnswer(posts: RetrievedPost[], query: string): Promise<string> {
  const chain = PROMPT.pipe(buildModel()).pipe(new StringOutputParser());
  return withRetryOn429(() => chain.invoke({ context: formatContext(posts), query }));
}
