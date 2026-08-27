"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CallRecord, CallOutcome } from "@/lib/types";
import { formatTimestamp } from "@/lib/format";

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

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-32 shrink-0 text-[10px] uppercase tracking-label text-mute">{label}</span>
      <div className="h-px flex-1 bg-hair">
        <div className="h-px bg-ink" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-ink">{value.toFixed(1)}</span>
    </div>
  );
}

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [call, setCall] = useState<CallRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CallRecord>>({});
  const [retrying, setRetrying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function load() {
    const res = await fetch(`/api/calls/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setCall(data.call);
    setForm(data.call);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    const res = await fetch(`/api/calls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: form.company,
        person: form.person,
        outcome: form.outcome,
        callbackAt: form.callbackAt,
        outcomeReason: form.outcomeReason,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setCall(data.call);
      setEditing(false);
    }
  }

  async function retry() {
    setRetrying(true);
    const res = await fetch(`/api/calls/${id}/retry`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setCall(data.call);
    }
    setRetrying(false);
  }

  async function remove() {
    if (!confirm("Delete this call?")) return;
    await fetch(`/api/calls/${id}`, { method: "DELETE" });
    router.push("/history");
  }

  function seekTo(seconds: number) {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds - (call?.startTime ?? 0);
      audioRef.current.play();
    }
  }

  if (!call) return <div className="label pt-20">Loading…</div>;

  return (
    <div className="animate-rise">
      <span className="label block">Call / {call.id.split("-").pop()}</span>
      <span className="mt-1 block text-2xl text-ink">{call.company ?? "Unknown company"}</span>
      <span className="label mt-1 block">{call.person ?? "—"}</span>

      {call.audioUrl && (
        <div className="mt-6 border border-hair px-4 py-3">
          <audio ref={audioRef} src={call.audioUrl} controls className="w-full" />
        </div>
      )}

      <div className="mt-8 border-t border-hair pt-4">
        <span className="label block">01 — Result</span>
        <span className="mt-1 block text-xl text-ink">{OUTCOME_LABELS[call.outcome]}</span>
        {call.outcomeReason && <span className="mt-1 block text-sm text-mute">{call.outcomeReason}</span>}
        {call.nextAction && (
          <p className="mt-2 text-sm text-ink">
            <span className="label">Next action</span> — {call.nextAction}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">02 — Summary</span>
        <p className="mt-2 text-sm leading-relaxed text-ink">{call.summary}</p>
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">03 — Three tens</span>
        <div className="mt-3 space-y-1">
          <Bar label="Product" value={call.threeTens.product} />
          <Bar label="You" value={call.threeTens.salesperson} />
          <Bar label="Alpinia" value={call.threeTens.company} />
        </div>
        <span className="mt-2 block text-sm text-ink">Avg — {call.threeTens.average.toFixed(1)} / 10</span>
        <p className="mt-1 text-xs text-mute">{call.threeTens.explanation}</p>
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">04 — Tonality</span>
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          <div>
            <span className="label mb-2 block text-hair">Salesperson</span>
            {Object.entries(call.tonalities.salesperson).map(([k, v]) => (
              <Bar key={k} label={k} value={v} />
            ))}
          </div>
          <div>
            <span className="label mb-2 block text-hair">Prospect</span>
            {Object.entries(call.tonalities.prospect).map(([k, v]) => (
              <Bar key={k} label={k} value={v} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-mute">{call.analysisNote}</p>
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">05 — Key moments</span>
        <div className="mt-3 space-y-3">
          {call.keyMoments.length === 0 && <span className="text-sm text-mute">No key moments detected.</span>}
          {call.keyMoments.map((m, i) => (
            <button
              key={i}
              onClick={() => {
                const line = call.transcript.find((l) => l.timestamp === m.timestamp);
                if (line) seekTo(line.startSeconds);
              }}
              className="block w-full text-left"
            >
              <span className="label">{m.timestamp} · {m.type.replace(/_/g, " ")}</span>
              <p className="mt-1 text-sm italic text-ink">"{m.quote}"</p>
              <p className="text-xs text-mute">{m.explanation}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">06 — Objections</span>
        <ul className="mt-2 space-y-1 text-sm text-ink">
          {call.objections.length === 0 ? <li className="text-mute">None detected.</li> : call.objections.map((o, i) => <li key={i}>— {o}</li>)}
        </ul>
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">07 — What worked</span>
        <ul className="mt-2 space-y-1 text-sm text-ink">
          {call.salespersonStrengths.length === 0 ? (
            <li className="text-mute">None detected.</li>
          ) : (
            call.salespersonStrengths.map((o, i) => <li key={i}>— {o}</li>)
          )}
        </ul>
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">08 — What to improve</span>
        <ul className="mt-2 space-y-1 text-sm text-ink">
          {call.salespersonMistakes.map((o, i) => (
            <li key={i}>— {o}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink">
          <span className="label">Recommendation</span> — {call.recommendedImprovement}
        </p>
      </div>

      <div className="mt-6 border-t border-hair pt-4">
        <span className="label block">09 — Transcript</span>
        <div className="mt-3 space-y-3">
          {call.transcript.map((line, i) => (
            <button key={i} onClick={() => seekTo(line.startSeconds)} className="block w-full text-left">
              <span className="label">[{line.timestamp}]</span>
              <p className="text-sm text-ink">{line.text}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-hair pt-4">
        {editing ? (
          <>
            <input
              value={form.company ?? ""}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="COMPANY"
              className="border border-hair bg-transparent px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
            />
            <input
              value={form.person ?? ""}
              onChange={(e) => setForm({ ...form, person: e.target.value })}
              placeholder="PERSON"
              className="border border-hair bg-transparent px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
            />
            <select
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value as CallOutcome })}
              className="border border-hair bg-transparent px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
            >
              {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button onClick={save} className="border border-ink bg-ink px-3 py-1.5 text-[10px] uppercase tracking-label text-paper">
              Save
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="text-[10px] uppercase tracking-label text-mute hover:text-ink">
            Edit
          </button>
        )}
        <button onClick={retry} disabled={retrying} className="text-[10px] uppercase tracking-label text-mute hover:text-ink disabled:opacity-50">
          {retrying ? "Retrying…" : "Retry analysis"}
        </button>
        <button onClick={remove} className="text-[10px] uppercase tracking-label text-mute hover:text-red">
          Delete
        </button>
      </div>
    </div>
  );
}
