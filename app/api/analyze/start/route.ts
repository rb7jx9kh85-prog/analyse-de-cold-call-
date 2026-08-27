import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { saveSession, saveWork, getSession, deleteWork, finalizeAudioUpload, readAudio, sanitizeSegment } from "@/lib/storage";
import { transcribeAudio, segmentCalls, MAX_AUDIO_BYTES } from "@/lib/ai/openai";
import { emptyStats } from "@/lib/sessionStats";
import { internalAuthHeaders } from "@/lib/internalFetch";
import type { SessionRecord } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let sessionId = "";
  let filename: string | undefined;

  try {
    const body = await req.json();
    sessionId = body.sessionId;
    filename = body.filename;
    const contentType: string | undefined = body.contentType;

    if (!sessionId || !filename) {
      return NextResponse.json({ error: "Requête invalide : sessionId ou filename manquant." }, { status: 400 });
    }

    // The temp upload is moved into the private audio store server-side (no client-supplied
    // URL is ever fetched here — the pathname is derived only from sessionId/filename, which
    // rules out SSRF via an arbitrary audioUrl).
    const audioPathname = await finalizeAudioUpload(sessionId, filename, contentType ?? "audio/mpeg");
    const audioProxyUrl = `/api/audio/${sanitizeSegment(sessionId)}/${sanitizeSegment(filename)}`;

    let session: SessionRecord = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      label: filename,
      audioUrl: audioProxyUrl,
      duration: 0,
      status: "transcribing",
      progressMessage: "02 — TRANSCRIBING",
      error: null,
      callIds: [],
      stats: emptyStats(),
    };
    await saveSession(session);

    const audio = await readAudio(audioPathname);
    if (!audio) {
      throw new Error("Impossible de récupérer le fichier audio uploadé.");
    }
    const audioBuffer = Buffer.from(await new Response(audio.stream).arrayBuffer());
    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      throw new Error(
        "Le fichier dépasse la limite de 25MB imposée par l'API de transcription. Découpe l'enregistrement en plusieurs fichiers plus courts et importe-les séparément."
      );
    }
    const file = new File([audioBuffer], filename, { type: contentType || "audio/mpeg" });

    const transcription = await transcribeAudio(file);

    session = { ...session, duration: transcription.duration, status: "detecting", progressMessage: "03 — DETECTING CALLS" };
    await saveSession(session);

    const segments = await segmentCalls(transcription.segments, transcription.duration);

    await saveWork(sessionId, {
      audioUrl: audioProxyUrl,
      duration: transcription.duration,
      transcriptSegments: transcription.segments,
      callSegments: segments,
    });

    if (segments.length === 0) {
      session = { ...session, status: "ready", progressMessage: null };
      await saveSession(session);
      await deleteWork(sessionId);
      return NextResponse.json({ sessionId, totalCalls: 0 });
    }

    session = {
      ...session,
      status: "analyzing",
      progressMessage: `04 — ANALYZING CALL 1 / ${segments.length}`,
    };
    await saveSession(session);

    // Hand off to /api/analyze/call, which analyzes exactly one call per invocation and
    // self-triggers the next one via waitUntil — the whole rest of the pipeline now runs
    // server-side and keeps going even if the browser navigates away or closes.
    waitUntil(
      fetch(`${req.nextUrl.origin}/api/analyze/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
        body: JSON.stringify({ sessionId, index: 0 }),
      }).catch(() => {})
    );

    return NextResponse.json({ sessionId, totalCalls: segments.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue pendant la transcription.";
    const existing = sessionId ? await getSession(sessionId) : null;
    const failed: SessionRecord = existing
      ? { ...existing, status: "error", error: message }
      : {
          id: sessionId || `SESSION-ERROR-${Date.now()}`,
          createdAt: new Date().toISOString(),
          label: filename ?? "Session",
          audioUrl: null,
          duration: 0,
          status: "error",
          progressMessage: null,
          error: message,
          callIds: [],
          stats: emptyStats(),
        };
    if (sessionId) await saveSession(failed);
    return NextResponse.json({ error: message, sessionId }, { status: 500 });
  }
}
