"use client";

import { useEffect, useState } from "react";
import type { CallRecord } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";

export default function NoAnswerPage() {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d) => setCalls((d.calls ?? []).filter((c: CallRecord) => c.outcome === "no_answer")));
  }, []);

  if (!calls) return <div className="label pt-20">Loading…</div>;

  return (
    <div className="animate-rise">
      <div className="flex items-baseline gap-4">
        <span className="text-6xl font-light tabular-nums text-ink md:text-7xl">{String(calls.length).padStart(2, "0")}</span>
        <span className="label">No answer</span>
      </div>
      <div className="mt-8">
        {calls.length === 0 ? (
          <span className="label">No missed calls yet.</span>
        ) : (
          calls.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-hair py-4">
              <span className="text-sm text-ink">{c.company ?? "Unknown company"}</span>
              <div className="text-right">
                <span className="label block">{formatDuration(c.duration)}</span>
                <span className="label mt-1 block">{formatDateTime(c.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
