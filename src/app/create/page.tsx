"use client";

import { useState } from "react";
import { useUserId } from "@/hooks/use-user-id";

type MediaResponse = {
  mediaAssetId: string;
  type: string;
  storageKey: string;
  url?: string;
};

export default function CreatePage() {
  const { userId, setUserId } = useUserId();
  const [media, setMedia] = useState<MediaResponse | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media", {
        method: "POST",
        headers: { "x-user-id": userId },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Failed to upload media");
      }

      const payload = (await response.json()) as MediaResponse;
      setMedia(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload media");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!media?.mediaAssetId) {
      setError("Upload a media file before creating a post.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          mediaAssetId: media.mediaAssetId,
          title: title || undefined,
          description: description || undefined,
          hashtags: hashtags || undefined,
          visibility,
          platforms: ["YOUTUBE"],
          scheduledFor: scheduledFor
            ? new Date(scheduledFor).toISOString()
            : undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Failed to create post");
      }

      const payload = await response.json();
      setPostId(payload.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!postId) {
      setError("Create a post before publishing.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/publish`, {
        method: "POST",
        headers: { "x-user-id": userId },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Failed to publish post");
      }

      window.location.href = `/posts/${postId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="pill w-fit">create</span>
          <h1 className="text-3xl font-semibold">Prepare a new post</h1>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Upload a video, craft your caption, and publish now or schedule
            later.
          </p>
        </header>

        <section className="card grid gap-6 p-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
              User ID
            </label>
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
              placeholder="user_123"
            />

            <div className="flex flex-col gap-3">
              <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Upload
              </label>
              <input
                type="file"
                accept="video/*,image/*"
                onChange={(event) => {
                  if (event.target.files?.[0]) {
                    handleUpload(event.target.files[0]);
                  }
                }}
                className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
              />
              {media ? (
                <p className="text-xs text-[color:var(--ink-soft)]">
                  Uploaded media: {media.mediaAssetId}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Platforms
              </label>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked readOnly />
                  YouTube
                </label>
                <label className="flex items-center gap-2 text-[color:var(--ink-soft)]">
                  <input type="checkbox" disabled />
                  Instagram (soon)
                </label>
                <label className="flex items-center gap-2 text-[color:var(--ink-soft)]">
                  <input type="checkbox" disabled />
                  Facebook (soon)
                </label>
                <label className="flex items-center gap-2 text-[color:var(--ink-soft)]">
                  <input type="checkbox" disabled />
                  TikTok (soon)
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
                placeholder="New video launch"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
                placeholder="Tell your audience what to expect."
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Hashtags
              </label>
              <input
                value={hashtags}
                onChange={(event) => setHashtags(event.target.value)}
                className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
                placeholder="#launch #creator"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
              >
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Schedule
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          <button
            onClick={handleCreatePost}
            disabled={loading}
            className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
          >
            Create post
          </button>
          <button
            onClick={handlePublish}
            disabled={loading || !postId}
            className="rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-black/40 disabled:opacity-50"
          >
            Publish now
          </button>
        </section>

        {postId ? (
          <div className="rounded-lg border border-black/10 bg-white/70 px-4 py-3 text-sm">
            Post created: <span className="font-semibold">{postId}</span>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
