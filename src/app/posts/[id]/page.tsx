"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useUserId } from "@/hooks/use-user-id";

type Destination = {
  id: string;
  platform: string;
  status: string;
  externalPostId: string | null;
  lastError: string | null;
};

type PostDetail = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  destinations: Destination[];
};

const TERMINAL_STATUSES = new Set([
  "PUBLISHED",
  "FAILED",
  "PARTIALLY_PUBLISHED",
]);

export default function PostStatusPage() {
  const params = useParams();
  const postId = params?.id as string;
  const { userId, setUserId } = useUserId();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shouldPoll = useMemo(() => {
    if (!post) return true;
    return !TERMINAL_STATUSES.has(post.status);
  }, [post]);

  const fetchPost = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        headers: { "x-user-id": userId },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Failed to load post");
      }

      const payload = (await response.json()) as PostDetail;
      setPost(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post");
    }
  }, [postId, userId]);

  useEffect(() => {
    if (!userId || !postId) return;
    fetchPost();
  }, [userId, postId, fetchPost]);

  useEffect(() => {
    if (!userId || !postId || !shouldPoll) return;

    const timer = window.setInterval(() => {
      fetchPost();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [userId, postId, shouldPoll, fetchPost]);

  return (
    <main className="page-shell">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="pill w-fit">post status</span>
          <h1 className="text-3xl font-semibold">
            {post?.title ?? "Post status"}
          </h1>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Status updates every 2s until publishing finishes.
          </p>
        </header>

        <section className="card flex flex-col gap-4 p-5">
          <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
            User ID
          </label>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
            placeholder="user_123"
          />
          <button
            onClick={fetchPost}
            className="w-fit rounded-lg border border-black/20 px-3 py-1 text-xs tracking-widest text-[color:var(--ink-soft)] uppercase"
          >
            Refresh
          </button>
        </section>

        {post ? (
          <section className="grid gap-4 md:grid-cols-2">
            {post.destinations.map((destination) => (
              <div key={destination.id} className="card p-5">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{destination.platform}</span>
                  <span className="text-xs text-[color:var(--ink-soft)]">
                    {destination.status}
                  </span>
                </div>
                <div className="mt-3 text-xs text-[color:var(--ink-soft)]">
                  External ID: {destination.externalPostId ?? "pending"}
                </div>
                {destination.lastError ? (
                  <div className="mt-3 text-xs text-red-600">
                    {destination.lastError}
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ) : (
          <p className="text-sm text-[color:var(--ink-soft)]">
            {postId ? "Loading post data..." : "Missing post id."}
          </p>
        )}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
