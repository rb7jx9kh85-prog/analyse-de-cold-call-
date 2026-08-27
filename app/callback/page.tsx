"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CallRecord } from "@/lib/types";

export default function CallbackPage() {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d) => setCalls((d.calls ?? []).filter((c: CallRecord) => c.outcome === "callback")));
  }, []);

  if (!calls) return <div className="label pt-20">Loading…</div>;

  const groups: Record<string, CallRecord[]> = { "No date": [] };
  for (const c of calls) {
    const key = c.callbackAt ?? "No date";
    groups[key] = groups[key] ?? [];
    groups[key].push(c);
  }

  return (
    <div className="animate-rise">
      <span className="label-ink block">Callbacks</span>
      <div className="mt-8 space-y-8">
        {Object.entries(groups)
          .filter(([, list]) => list.length > 0)
          .map(([label, list]) => (
            <div key={label}>
              <span className="label block border-b border-hair pb-2">{label}</span>
              <div className="mt-2">
                {list.map((c) => (
                  <Link key={c.id} href={`/call/${c.id}`} className="flex items-center justify-between border-b border-hair py-3">
                    <span className="text-sm text-ink">{c.company ?? "Unknown company"}</span>
                    <span className="label">{c.outcomeReason ?? "—"}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        {calls.length === 0 && <span className="label">No callbacks scheduled.</span>}
      </div>
    </div>
  );
}
