"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { formatDate } from "@/lib/format";

async function parseJsonSafe(res: Response): Promise<any> {
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    return { error: res.status === 413 ? "Fichier trop volumineux." : `Erreur serveur (${res.status}).` };
  }
}

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [progress, setProgress] = useState<string>("01 — UPLOADING");
  const [failedCalls, setFailedCalls] = useState(0);
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
    setFailedCalls(0);
    setProgress("01 — UPLOADING");

    try {
      const sessionId = `SESSION-${Date.now().toString(36).toUpperCase()}`;

      const blob = await upload(`audio/${sessionId}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });

      setProgress("02 — TRANSCRIBING");

      const startRes = await fetch("/api/analyze/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, audioUrl: blob.url, filename: file.name, contentType: file.type }),
      });
      const startData = await parseJsonSafe(startRes);
      if (!startRes.ok) {
        setError(startData.error ?? "Erreur pendant la transcription.");
        setStatus("error");
        return;
      }

      const totalCalls: number = startData.totalCalls ?? 0;
      if (totalCalls === 0) {
        router.push(`/history/${sessionId}`);
        return;
      }

      let failures = 0;
      for (let i = 0; i < totalCalls; i++) {
        setProgress(`04 — ANALYZING CALL ${i + 1} / ${totalCalls}`);
        const callRes = await fetch("/api/analyze/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, index: i }),
        });
        if (!callRes.ok) {
          failures += 1;
          setFailedCalls(failures);
        }
      }

      router.push(`/history/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
      setStatus("error");
    }
  }

  if (status === "processing") {
    return (
      <div className="animate-rise pt-12">
        <span className="label-ink block animate-blink">{progress}</span>
        {failedCalls > 0 && (
          <p className="mt-4 text-xs text-mute">
            {failedCalls} call(s) en erreur — récupérables individuellement via "Retry analysis" depuis leur page.
          </p>
        )}
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
