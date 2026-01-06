"use client";

import { useCallback, useEffect, useState } from "react";
import { useUserId } from "@/hooks/use-user-id";

type PostSummary = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  destinations: Array<{ platform: string; status: string }>;
};

export default function PostsPage() {
  const { userId, setUserId } = useUserId();
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/posts?take=20", {
        headers: { "x-user-id": userId },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Failed to load posts");
      }

      const payload = (await response.json()) as PostSummary[];
      setPosts(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [userId, fetchPosts]);

  return (
    <main className="page-shell">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="pill w-fit">posts</span>
          <h1 className="text-3xl font-semibold">Recent publishes</h1>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Open a post to track live status per platform.
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
            onClick={fetchPosts}
            className="w-fit rounded-lg border border-black/20 px-3 py-1 text-xs tracking-widest text-[color:var(--ink-soft)] uppercase"
          >
            Refresh
          </button>
        </section>

        {loading ? (
          <p className="text-sm text-[color:var(--ink-soft)]">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-[color:var(--ink-soft)]">
            No posts yet. Create one first.
          </p>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <a
                key={post.id}
                href={`/posts/${post.id}`}
                className="card flex flex-col gap-3 p-5 transition hover:-translate-y-1"
              >
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{post.title ?? "Untitled post"}</span>
                  <span className="text-xs text-[color:var(--ink-soft)]">
                    {post.status}
                  </span>
                </div>
                <div className="text-xs text-[color:var(--ink-soft)]">
                  {post.destinations.map((dest) => dest.platform).join(", ")}
                </div>
                <div className="text-xs text-[color:var(--ink-soft)]">
                  Created {new Date(post.createdAt).toLocaleString()}
                </div>
              </a>
            ))}
          </section>
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
