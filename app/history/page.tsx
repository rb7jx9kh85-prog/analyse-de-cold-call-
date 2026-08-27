"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SessionRecord, CallRecord } from "@/lib/types";
import { formatDate, formatDuration } from "@/lib/format";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [query, setQuery] = useState("");

  async function loadSessions() {
    const res = await fetch("/api/sessions");
    const d = await res.json();
    const list: SessionRecord[] = d.sessions ?? [];
    setSessions(list);
    return list;
  }

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d) => setCalls(d.calls ?? []));

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const list = await loadSessions();
      if (cancelled) return;
      const anyInProgress = list.some((s) => s.status !== "ready" && s.status !== "error");
      if (anyInProgress) {
        timer = setTimeout(poll, 5000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return calls.filter(
      (c) =>
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.person ?? "").toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.outcome.toLowerCase().includes(q)
    );
  }, [query, calls]);

  if (!sessions) return <div className="label pt-20">Loading…</div>;

  return (
    <div className="animate-rise">
      <span className="label-ink block">History</span>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SEARCH COMPANY, PERSON, OUTCOME…"
        className="mt-6 w-full border border-hair bg-transparent px-3 py-2 text-[10px] uppercase tracking-label text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />

      {searchResults ? (
        <div className="mt-6">
          {searchResults.length === 0 ? (
            <span className="label">No results.</span>
          ) : (
            searchResults.map((c) => (
              <Link key={c.id} href={`/call/${c.id}`} className="flex items-center justify-between border-b border-hair py-3">
                <span className="text-sm text-ink">{c.company ?? "Unknown company"}</span>
                <span className="label">{c.outcome}</span>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {sessions.length === 0 && <span className="label">No sessions yet. Analyze a recording to get started.</span>}
          {sessions.map((s) => (
            <div key={s.id}>
              <span className="label block">{formatDate(s.createdAt)}</span>
              <Link href={`/history/${s.id}`} className="mt-2 flex items-center justify-between border-b border-hair pb-4 hover:opacity-70">
                <div>
                  <span className="block text-sm text-ink">{s.id}</span>
                  <span className="label mt-1 block">
                    {formatDuration(s.duration)} · {s.stats.totalCalls} calls
                  </span>
                </div>
                {s.status !== "ready" && s.status !== "error" ? (
                  <span className="label-ink animate-blink">{s.progressMessage ?? "PROCESSING…"}</span>
                ) : s.status === "error" ? (
                  <span className="text-[10px] uppercase tracking-label text-red">Error</span>
                ) : (
                  <div className="text-right text-xs text-mute">
                    <span className="block">{String(s.stats.yes).padStart(2, "0")} YES</span>
                    <span className="block">{String(s.stats.no).padStart(2, "0")} NO</span>
                    <span className="block">{String(s.stats.noAnswer).padStart(2, "0")} NO ANSWER</span>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
