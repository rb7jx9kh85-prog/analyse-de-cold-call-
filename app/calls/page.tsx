"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CallRecord, CallOutcome } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  accepted: "Accepted",
  interested: "Interested",
  callback: "Callback",
  send_mockup: "Send mockup",
  send_email: "Send email",
  send_whatsapp: "Send whatsapp",
  meeting: "Meeting",
  not_interested: "Not interested",
  no_answer: "No answer",
  wrong_number: "Wrong number",
  gatekeeper: "Gatekeeper",
  unknown: "Unknown",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d) => setCalls((d.calls ?? []).sort((a: CallRecord, b: CallRecord) => (a.createdAt < b.createdAt ? 1 : -1))));
  }, []);

  const filtered = useMemo(() => {
    if (!calls) return [];
    if (!query.trim()) return calls;
    const q = query.toLowerCase();
    return calls.filter(
      (c) =>
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.person ?? "").toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.outcome.toLowerCase().includes(q)
    );
  }, [calls, query]);

  if (!calls) return <div className="label pt-20">Loading…</div>;

  const avgThreeTens = calls.length ? calls.reduce((sum, c) => sum + c.threeTens.average, 0) / calls.length : 0;

  return (
    <div className="animate-rise">
      <div className="flex items-baseline gap-4">
        <span className="text-6xl font-light tabular-nums text-ink md:text-7xl">{String(calls.length).padStart(2, "0")}</span>
        <span className="label">Calls total</span>
      </div>
      <span className="label mt-2 block">Avg three tens — {avgThreeTens.toFixed(1)} / 10</span>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SEARCH COMPANY, PERSON, OUTCOME…"
        className="mt-6 w-full border border-hair bg-transparent px-3 py-2 text-[10px] uppercase tracking-label text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />

      <div className="mt-6">
        {filtered.length === 0 ? (
          <span className="label">No calls found.</span>
        ) : (
          filtered.map((c) => (
            <Link key={c.id} href={`/call/${c.id}`} className="block border-b border-hair py-4 transition-colors duration-100 hover:bg-hair/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm uppercase tracking-wide text-ink">{c.company ?? "Unknown company"}</span>
                  <span className="label mt-1 block">
                    {c.person ?? "—"} · {OUTCOME_LABELS[c.outcome]}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-sm text-ink">{c.threeTens.average.toFixed(1)} / 10</span>
                  <span className="label mt-1 block">{formatDateTime(c.createdAt)}</span>
                </div>
              </div>
              <p className="mt-2 max-w-2xl text-xs text-mute">{c.summary}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
