import { NextRequest, NextResponse } from "next/server";
import { saveSession, saveWork, getSession } from "@/lib/storage";
import { transcribeAudio, segmentCalls, MAX_AUDIO_BYTES } from "@/lib/ai/openai";
import { emptyStats } from "@/lib/sessionStats";
import type { SessionRecord } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let sessionId = "";
  let audioUrl: string | undefined;
  let filename: string | undefined;

  try {
    const body = await req.json();
    sessionId = body.sessionId;
    audioUrl = body.audioUrl;
    filename = body.filename;
    const contentType: string | undefined = body.contentType;

    if (!sessionId || !audioUrl) {
      return NextResponse.json({ error: "Requête invalide : sessionId ou audioUrl manquant." }, { status: 400 });
    }

    let session: SessionRecord = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      label: filename ?? "Session",
      audioUrl,
      duration: 0,
      status: "transcribing",
      progressMessage: "02 — TRANSCRIBING",
      error: null,
      callIds: [],
      stats: emptyStats(),
    };
    await saveSession(session);

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      throw new Error("Impossible de récupérer le fichier audio uploadé.");
    }
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      throw new Error(
        "Le fichier dépasse la limite de 25MB imposée par l'API de transcription. Découpe l'enregistrement en plusieurs fichiers plus courts et importe-les séparément."
      );
    }
    const file = new File([audioBuffer], filename ?? "recording", { type: contentType || "audio/mpeg" });

    const transcription = await transcribeAudio(file);

    session = { ...session, duration: transcription.duration, status: "detecting", progressMessage: "03 — DETECTING CALLS" };
    await saveSession(session);

    const segments = await segmentCalls(transcription.segments, transcription.duration);

    await saveWork(sessionId, {
      audioUrl,
      duration: transcription.duration,
      transcriptSegments: transcription.segments,
      callSegments: segments,
    });

    session = {
      ...session,
      status: "analyzing",
      progressMessage: `04 — ANALYZING CALL 1 / ${segments.length}`,
    };
    await saveSession(session);

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
          audioUrl: audioUrl ?? null,
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
