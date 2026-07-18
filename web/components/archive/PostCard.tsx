import { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border border-white/10 p-4 hover:border-white/25"
    >
      <div className="flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center gap-2">
          <span className="rounded bg-white/10 px-1.5 py-0.5 uppercase">{post.platform}</span>
          <span>{post.creator_handle}</span>
        </div>
        <span>Score {post.engagement_score.toFixed(0)}</span>
      </div>

      <p className="mt-2 text-sm text-white/90">{post.text}</p>

      <div className="mt-2 flex gap-3 text-xs text-white/40">
        {post.platform === "twitter" ? (
          <>
            <span>{post.views ?? 0} views</span>
            <span>{post.likes ?? 0} likes</span>
            <span>{post.reposts ?? 0} reposts</span>
            <span>{post.replies ?? 0} replies</span>
          </>
        ) : (
          <>
            <span>{post.score ?? 0} upvotes</span>
            <span>{post.num_comments ?? 0} comments</span>
          </>
        )}
      </div>
    </a>
  );
}
