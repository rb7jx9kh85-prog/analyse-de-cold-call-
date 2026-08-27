import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadAudio, saveSession, saveCall, getSession } from "@/lib/storage";
import { transcribeAudio, segmentCalls, analyzeCall } from "@/lib/ai/openai";
import { formatTimestamp } from "@/lib/format";
import type { CallRecord, SessionRecord, TranscriptLine } from "@/lib/types";
import { outcomeGroup } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/m4a", "audio/x-m4a", "video/mp4"];
const MAX_SIZE = 25 * 1024 * 1024;

function computeStats(calls: CallRecord[]): SessionRecord["stats"] {
  const yes = calls.filter((c) => outcomeGroup(c.outcome) === "yes").length;
  const no = calls.filter((c) => outcomeGroup(c.outcome) === "no").length;
  const noAnswer = calls.filter((c) => outcomeGroup(c.outcome) === "no_answer").length;
  const callback = calls.filter((c) => outcomeGroup(c.outcome) === "callback").length;
  const answered = calls.length - noAnswer;
  const answerRate = calls.length > 0 ? Math.round((answered / calls.length) * 100) : 0;
  const positiveRate = calls.length > 0 ? Math.round((yes / calls.length) * 100) : 0;

  let best: CallRecord | null = null;
  let worst: CallRecord | null = null;
  for (const c of calls) {
    if (c.outcome === "no_answer") continue;
    if (!best || c.threeTens.average > best.threeTens.average) best = c;
    if (!worst || c.threeTens.average < worst.threeTens.average) worst = c;
  }

  const objectionCounts = new Map<string, number>();
  for (const c of calls) {
    for (const o of c.objections) {
      objectionCounts.set(o, (objectionCounts.get(o) ?? 0) + 1);
    }
  }
  let topObjection: string | null = null;
  let topCount = 0;
  for (const [obj, count] of objectionCounts) {
    if (count > topCount) {
      topObjection = obj;
      topCount = count;
    }
  }

  return {
    totalCalls: calls.length,
    yes,
    no,
    noAnswer,
    callback,
    positiveRate,
    answerRate,
    sessionScore: null,
    bestCallId: best?.id ?? null,
    worstCallId: worst?.id ?? null,
    topObjection,
    mainIssue: null,
    improvementTip: null,
  };
}

export async function POST(req: NextRequest) {
  const sessionId = `SESSION-${Date.now().toString(36).toUpperCase()}`;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse 25MB. Découpe l'enregistrement en fichiers plus courts et réessaie." },
        { status: 400 }
      );
    }
    if (ALLOWED_TYPES.length && file.type && !ALLOWED_TYPES.includes(file.type)) {
      // Some browsers/OS mislabel mp3/m4a mime types — don't hard block, just log via note.
    }

    let session: SessionRecord = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      label: file.name,
      audioUrl: null,
      duration: 0,
      status: "uploading",
      progressMessage: "01 — UPLOADING",
      error: null,
      callIds: [],
      stats: computeStats([]),
    };
    await saveSession(session);

    const buffer = Buffer.from(await file.arrayBuffer());
    const audioUrl = await uploadAudio(sessionId, file.name, buffer, file.type || "audio/mpeg");

    session = { ...session, audioUrl, status: "transcribing", progressMessage: "02 — TRANSCRIBING" };
    await saveSession(session);

    const transcription = await transcribeAudio(file);

    session = { ...session, duration: transcription.duration, status: "detecting", progressMessage: "03 — DETECTING CALLS" };
    await saveSession(session);

    const segments = await segmentCalls(transcription.segments, transcription.duration);

    session = { ...session, status: "analyzing", progressMessage: `04 — ANALYZING CALL 1 / ${segments.length}` };
    await saveSession(session);

    const callIds: string[] = [];
    const calls: CallRecord[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const lines: TranscriptLine[] = transcription.segments
        .filter((s) => s.start >= seg.startTime - 1 && s.start < seg.endTime)
        .map((s) => ({
          timestamp: formatTimestamp(s.start),
          startSeconds: s.start,
          speaker: "SPEAKER",
          text: s.text,
        }));

      const transcriptText = lines.map((l) => `[${l.timestamp}] ${l.text}`).join("\n") || seg.reason;

      let analysis;
      try {
        analysis = await analyzeCall(transcriptText, seg.endTime - seg.startTime);
      } catch {
        analysis = null;
      }

      const callId = `CALL-${sessionId}-${String(i + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;

      const call: CallRecord = {
        id: callId,
        sessionId,
        createdAt: new Date().toISOString(),
        startTime: seg.startTime,
        endTime: seg.endTime,
        duration: seg.endTime - seg.startTime,
        company: analysis?.prospect.company ?? null,
        person: analysis?.prospect.person ?? null,
        phone: analysis?.prospect.phone ?? null,
        outcome: analysis?.outcome ?? "unknown",
        outcomeReason: analysis?.outcomeReason ?? null,
        interestScore: analysis?.interestScore ?? 0,
        transcript: lines,
        summary: analysis?.summary ?? "Analyse indisponible pour cet appel.",
        nextAction: analysis?.nextAction ?? null,
        callbackAt: analysis?.callbackAt ?? null,
        objections: analysis?.objections ?? [],
        positiveSignals: analysis?.positiveSignals ?? [],
        negativeSignals: analysis?.negativeSignals ?? [],
        salespersonStrengths: analysis?.salespersonStrengths ?? [],
        salespersonMistakes: analysis?.salespersonMistakes ?? [],
        recommendedImprovement: analysis?.recommendedImprovement ?? "N/A",
        threeTens: analysis?.threeTens ?? { product: 0, salesperson: 0, company: 0, average: 0, explanation: "Non évalué." },
        tonalities: analysis?.tonalities ?? {
          salesperson: {
            certainty: 0,
            enthusiasm: 0,
            confidence: 0,
            authority: 0,
            empathy: 0,
            curiosity: 0,
            scarcity: 0,
            reasonableness: 0,
            urgency: 0,
            clarity: 0,
            energy: 0,
            pacing: 0,
          },
          prospect: {
            interest: 0,
            trust: 0,
            curiosity: 0,
            skepticism: 0,
            resistance: 0,
            urgency: 0,
            engagement: 0,
            impatience: 0,
          },
        },
        scriptScores: analysis?.scriptScores ?? { opener: 0, hook: 0, discovery: 0, pitch: 0, objectionHandling: 0, close: 0 },
        keyMoments: analysis?.keyMoments ?? [],
        audioUrl,
        analysisNote:
          analysis?.analysisNote ??
          "Analyse indisponible : ce call sera marqué comme échoué et peut être relancé individuellement.",
      };

      await saveCall(call);
      callIds.push(callId);
      calls.push(call);

      session = {
        ...session,
        callIds,
        stats: computeStats(calls),
        progressMessage: `04 — ANALYZING CALL ${i + 1} / ${segments.length}`,
      };
      await saveSession(session);
    }

    session = { ...session, status: "saving", progressMessage: "05 — SAVING" };
    await saveSession(session);

    session = { ...session, status: "ready", progressMessage: null };
    await saveSession(session);

    return NextResponse.json({ sessionId, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue pendant l'analyse.";
    const existing = await getSession(sessionId);
    const failed: SessionRecord = existing
      ? { ...existing, status: "error", error: message }
      : {
          id: sessionId,
          createdAt: new Date().toISOString(),
          label: "Session",
          audioUrl: null,
          duration: 0,
          status: "error",
          progressMessage: null,
          error: message,
          callIds: [],
          stats: computeStats([]),
        };
    await saveSession(failed);
    return NextResponse.json({ error: message, sessionId }, { status: 500 });
  }
}
