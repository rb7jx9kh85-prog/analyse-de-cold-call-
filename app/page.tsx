"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addLocalCall, todayLocalCalls, type LocalCallEntry } from "@/lib/localCounter";
import type { SessionRecord } from "@/lib/types";
import { formatDuration } from "@/lib/format";

export default function HomePage() {
  const [today, setToday] = useState<LocalCallEntry[]>([]);
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setToday(todayLocalCalls());
    setLoaded(true);
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => {
        const sessions: SessionRecord[] = data.sessions ?? [];
        setLastSession(sessions[0] ?? null);
      })
      .catch(() => {});
  }, []);

  function record(result: LocalCallEntry["result"]) {
    setToday(addLocalCall(result).filter((e) => new Date(e.at).toDateString() === new Date().toDateString()));
  }

  const yes = today.filter((e) => e.result === "yes").length;
  const no = today.filter((e) => e.result === "no").length;
  const noAnswer = today.filter((e) => e.result === "no_answer").length;
  const total = today.length;
  const positiveRate = total > 0 ? ((yes / total) * 100).toFixed(1) : "0.0";

  if (!loaded) {
    return <div className="pt-20 label text-hair">Loading local data…</div>;
  }

  return (
    <div className="animate-rise">
      <div className="flex items-baseline gap-4">
        <span className="text-6xl font-light tabular-nums text-ink md:text-7xl">{String(total).padStart(2, "0")}</span>
        <span className="label">Calls today</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => record("yes")}
          className="border border-hair px-4 py-6 text-[10px] uppercase tracking-label text-ink transition-colors duration-100 hover:border-ink"
        >
          Call
        </button>
        <button
          onClick={() => record("yes")}
          className="border border-ink px-4 py-6 text-[10px] uppercase tracking-label text-ink transition-colors duration-100 hover:bg-ink hover:text-paper"
        >
          Yes
        </button>
        <button
          onClick={() => record("no")}
          className="border border-hair px-4 py-6 text-[10px] uppercase tracking-label text-ink transition-colors duration-100 hover:border-red hover:text-red"
        >
          No
        </button>
        <button
          onClick={() => record("no_answer")}
          className="border border-hair px-4 py-6 text-[10px] uppercase tracking-label text-mute transition-colors duration-100 hover:border-ink hover:text-ink"
        >
          No answer
        </button>
      </div>

      <div className="mt-10 border-t border-hair pt-4">
        <span className="label">Today</span>
        <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm text-ink sm:grid-cols-4">
          <span>{String(total).padStart(2, "0")} calls</span>
          <span>{String(yes).padStart(2, "0")} yes</span>
          <span>{String(no).padStart(2, "0")} no</span>
          <span>{String(noAnswer).padStart(2, "0")} no answer</span>
        </div>
        <span className="mt-2 block text-xs text-mute">{positiveRate}% positive</span>
      </div>

      {lastSession && (
        <div className="mt-6 border-t border-hair pt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="label block">Last session</span>
              <span className="mt-1 block text-sm text-ink">
                {formatDuration(lastSession.duration)} · {lastSession.stats.totalCalls} calls
              </span>
            </div>
            <Link href={`/history/${lastSession.id}`} className="label-ink hover:text-red">
              View →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
