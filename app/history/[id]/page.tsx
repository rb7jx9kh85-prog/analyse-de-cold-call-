"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SessionRecord, CallRecord } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { CallListItem } from "@/components/CallListItem";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [insightLoading, setInsightLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setSession(data.session);
    setCalls(data.calls ?? []);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function runInsight() {
    setInsightLoading(true);
    const res = await fetch(`/api/sessions/${id}/insight`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setSession(data.session);
    }
    setInsightLoading(false);
  }

  async function deleteSession() {
    if (!confirm("Delete this session and all its calls?")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    router.push("/history");
  }

  if (!session) return <div className="label pt-20">Loading…</div>;

  const bestCall = calls.find((c) => c.id === session.stats.bestCallId);
  const worstCall = calls.find((c) => c.id === session.stats.worstCallId);

  return (
    <div className="animate-rise">
      <span className="label-ink block">{session.id}</span>
      <span className="label mt-1 block">{formatDateTime(session.createdAt)}</span>

      <div className="mt-6 grid grid-cols-2 gap-y-3 border-b border-hair pb-6 sm:grid-cols-4">
        <div>
          <span className="block text-2xl text-ink">{session.stats.totalCalls}</span>
          <span className="label">Calls</span>
        </div>
        <div>
          <span className="block text-2xl text-ink">{session.stats.yes}</span>
          <span className="label">Yes</span>
        </div>
        <div>
          <span className="block text-2xl text-ink">{session.stats.no}</span>
          <span className="label">No</span>
        </div>
        <div>
          <span className="block text-2xl text-ink">{session.stats.positiveRate}%</span>
          <span className="label">Positive</span>
        </div>
      </div>

      <div className="mt-6 border-b border-hair pb-6">
        {session.stats.sessionScore !== null ? (
          <>
            <span className="label block">Session score</span>
            <span className="mt-1 block text-3xl text-ink">{session.stats.sessionScore.toFixed(1)} / 10</span>
            {bestCall && (
              <p className="mt-3 text-sm text-ink">
                <span className="label">Best call</span> — {bestCall.company ?? "Unknown"} ({bestCall.threeTens.average.toFixed(1)})
              </p>
            )}
            {worstCall && (
              <p className="mt-1 text-sm text-ink">
                <span className="label">Worst call</span> — {worstCall.company ?? "Unknown"} ({worstCall.threeTens.average.toFixed(1)})
              </p>
            )}
            {session.stats.topObjection && (
              <p className="mt-1 text-sm text-ink">
                <span className="label">Top objection</span> — "{session.stats.topObjection}"
              </p>
            )}
            {session.stats.mainIssue && (
              <div className="mt-4">
                <span className="label block">Today's main issue</span>
                <p className="mt-1 text-sm text-ink">{session.stats.mainIssue}</p>
              </div>
            )}
            {session.stats.improvementTip && (
              <div className="mt-4">
                <span className="label block">One thing to improve next session</span>
                <p className="mt-1 text-sm text-ink">{session.stats.improvementTip}</p>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={runInsight}
            disabled={insightLoading}
            className="border border-ink px-4 py-2 text-[10px] uppercase tracking-label text-ink hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            {insightLoading ? "Analyzing…" : "Generate session insight →"}
          </button>
        )}
      </div>

      <div className="mt-6">
        <span className="label block border-b border-hair pb-2">Calls ({formatDuration(session.duration)})</span>
        {calls.map((c) => (
          <CallListItem key={c.id} call={c} />
        ))}
      </div>

      <button onClick={deleteSession} className="mt-8 text-[10px] uppercase tracking-label text-mute hover:text-red">
        Delete session
      </button>
    </div>
  );
}
