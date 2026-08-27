"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { formatDate } from "@/lib/format";

const STEPS = ["01 — UPLOADING", "02 — TRANSCRIBING", "03 — DETECTING CALLS", "04 — ANALYZING", "05 — SAVING"];

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [progress, setProgress] = useState<string>(STEPS[0]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  async function startAnalysis() {
    if (!file) return;
    setStatus("processing");
    setError(null);
    setProgress(STEPS[0]);

    const pollInterval = setInterval(() => {
      setProgress((prev) => {
        const idx = STEPS.indexOf(prev);
        return idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : prev;
      });
    }, 4000);

    try {
      const sessionId = `SESSION-${Date.now().toString(36).toUpperCase()}`;

      const blob = await upload(`audio/${sessionId}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });

      setProgress(STEPS[1]);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, audioUrl: blob.url, filename: file.name, contentType: file.type }),
      });
      clearInterval(pollInterval);

      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        setError(res.status === 413 ? "Fichier trop volumineux pour être analysé." : `Erreur serveur (${res.status}).`);
        setStatus("error");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Erreur pendant l'analyse.");
        setStatus("error");
        return;
      }
      router.push(`/history/${data.sessionId}`);
    } catch (err) {
      clearInterval(pollInterval);
      setError(err instanceof Error ? err.message : "Erreur réseau.");
      setStatus("error");
    }
  }

  if (status === "processing") {
    return (
      <div className="animate-rise pt-12">
        <span className="label-ink block">Analyzing session</span>
        <div className="mt-6 space-y-3">
          {STEPS.map((step) => {
            const isActive = step === progress;
            const isDone = STEPS.indexOf(step) < STEPS.indexOf(progress);
            return (
              <div key={step} className={`text-sm ${isActive ? "text-ink animate-blink" : isDone ? "text-mute" : "text-hair"}`}>
                {step}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <span className="label-ink block">Analyze</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center border px-6 py-20 text-center transition-colors duration-100 ${
          dragging ? "border-ink" : "border-hair hover:border-ink"
        }`}
      >
        <span className="label-ink">Drop call recording</span>
        <span className="label mt-2">MP3 / M4A / WAV</span>
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.m4a,.wav,.mp4,audio/*,video/mp4"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="mt-6 border-t border-hair pt-4">
          <span className="label block">{file.name}</span>
          <span className="mt-1 block text-sm text-ink">{formatDate(new Date().toISOString())}</span>
          <button
            onClick={startAnalysis}
            className="mt-4 border border-ink bg-ink px-4 py-2 text-[10px] uppercase tracking-label text-paper transition-colors duration-100 hover:bg-transparent hover:text-ink"
          >
            Analyze calls →
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6 border border-red px-4 py-3">
          <span className="block text-[10px] uppercase tracking-label text-red">{error}</span>
        </div>
      )}
    </div>
  );
}
