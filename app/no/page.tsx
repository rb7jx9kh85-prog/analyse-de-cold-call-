"use client";

import { useEffect, useMemo, useState } from "react";
import type { CallRecord } from "@/lib/types";
import { outcomeGroup } from "@/lib/types";
import { CallListItem } from "@/components/CallListItem";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "not_interested", label: "No need" },
  { key: "wrong_number", label: "Wrong number" },
  { key: "gatekeeper", label: "Gatekeeper" },
] as const;

export default function NoPage() {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d) => setCalls((d.calls ?? []).filter((c: CallRecord) => outcomeGroup(c.outcome) === "no")));
  }, []);

  const filtered = useMemo(() => {
    if (!calls) return [];
    if (filter === "all") return calls;
    return calls.filter((c) => c.outcome === filter);
  }, [calls, filter]);

  if (!calls) return <div className="label pt-20">Loading…</div>;

  return (
    <div className="animate-rise">
      <div className="flex items-baseline gap-4">
        <span className="text-6xl font-light tabular-nums text-ink md:text-7xl">{String(calls.length).padStart(2, "0")}</span>
        <span className="label">Refusals</span>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 border-b border-hair pb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[10px] uppercase tracking-label ${filter === f.key ? "text-ink" : "text-mute hover:text-ink"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? <span className="label">No refusals in this filter.</span> : filtered.map((c) => <CallListItem key={c.id} call={c} />)}
      </div>
    </div>
  );
}
