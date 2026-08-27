"use client";

import { useEffect, useState } from "react";
import type { CallRecord } from "@/lib/types";
import { outcomeGroup } from "@/lib/types";
import { CallListItem } from "@/components/CallListItem";

export default function YesPage() {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d) => setCalls((d.calls ?? []).filter((c: CallRecord) => outcomeGroup(c.outcome) === "yes")));
  }, []);

  if (!calls) return <div className="label pt-20">Loading…</div>;

  return (
    <div className="animate-rise">
      <div className="flex items-baseline gap-4">
        <span className="text-6xl font-light tabular-nums text-ink md:text-7xl">{String(calls.length).padStart(2, "0")}</span>
        <span className="label">Positive calls</span>
      </div>
      <div className="mt-8">
        {calls.length === 0 ? (
          <span className="label">No positive calls yet.</span>
        ) : (
          calls.map((c) => <CallListItem key={c.id} call={c} />)
        )}
      </div>
    </div>
  );
}
