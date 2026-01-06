"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUserId } from "@/hooks/use-user-id";

type Connection = {
  id: string;
  platform: string;
  externalUserId: string | null;
  externalUsername: string | null;
  tokenType: string | null;
  scope: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

export default function ConnectionsPage() {
  const { userId, setUserId } = useUserId();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectedPlatform = searchParams.get("connected");

  const statusTag = useMemo(() => {
    if (!connectedPlatform) return null;
    return `Connected ${connectedPlatform}`;
  }, [connectedPlatform]);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/connections", {
        headers: { "x-user-id": userId },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error?.message ?? "Failed to load connections",
        );
      }

      const data = (await response.json()) as Connection[];
      setConnections(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load connections",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchConnections();
    }
  }, [userId, fetchConnections]);

  const handleConnectYouTube = async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/oauth/youtube/start", {
        headers: { "x-user-id": userId },
        redirect: "manual",
      });

      const location = response.headers.get("Location");
      if (location) {
        window.location.href = location;
        return;
      }

      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message ?? "Failed to start OAuth");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="pill w-fit">connections</span>
          <h1 className="text-3xl font-semibold">Link your platforms</h1>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Use the same user id across requests. OAuth uses it to store tokens.
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
          {statusTag ? (
            <div className="rounded-lg bg-[color:var(--accent-soft)] px-3 py-2 text-sm text-[color:var(--accent-strong)]">
              {statusTag}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card flex flex-col gap-4 p-5">
            <h2 className="text-lg font-semibold">YouTube</h2>
            <p className="text-sm text-[color:var(--ink-soft)]">
              Connect your Google account to publish videos.
            </p>
            <button
              onClick={handleConnectYouTube}
              disabled={connecting}
              className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
            >
              {connecting ? "Connecting..." : "Connect YouTube"}
            </button>
          </div>

          <div className="card flex flex-col gap-4 p-5">
            <h2 className="text-lg font-semibold">Connections</h2>
            {loading ? (
              <p className="text-sm text-[color:var(--ink-soft)]">Loading...</p>
            ) : connections.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-soft)]">
                No connections yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {connections.map((connection) => {
                  const expiresAt = connection.expiresAt
                    ? new Date(connection.expiresAt)
                    : null;
                  const isExpired =
                    !!expiresAt && expiresAt.getTime() < Date.now();

                  return (
                    <li
                      key={connection.id}
                      className="rounded-xl border border-black/5 bg-white/70 p-3"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{connection.platform}</span>
                        <span
                          className={`text-xs ${
                            isExpired
                              ? "text-red-600"
                              : connection.isActive
                                ? "text-green-700"
                                : "text-amber-700"
                          }`}
                        >
                          {isExpired
                            ? "expired"
                            : connection.isActive
                              ? "active"
                              : "inactive"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-[color:var(--ink-soft)]">
                        {connection.externalUsername ??
                          connection.externalUserId ??
                          "No profile"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
