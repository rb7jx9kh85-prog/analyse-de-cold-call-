import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { waitUntil } from "@vercel/functions";
import { getSession, saveSession, saveCall, getWork, deleteWork, listCalls } from "@/lib/storage";
import { analyzeCall } from "@/lib/ai/openai";
import { formatTimestamp } from "@/lib/format";
import { computeStats } from "@/lib/sessionStats";
import { internalAuthHeaders } from "@/lib/internalFetch";
import type { CallRecord, SessionRecord, TranscriptLine, SessionWorkData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Fires the next call's analysis without waiting for it — this is what lets the whole
 * pipeline keep running server-side after the browser navigates away or the tab closes.
 * waitUntil keeps this function instance alive long enough to actually send the request. */
function scheduleNextCall(origin: string, sessionId: string, nextIndex: number) {
  waitUntil(
    fetch(`${origin}/api/analyze/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
      body: JSON.stringify({ sessionId, index: nextIndex }),
    }).catch(() => {
      /* best effort — if this hop fails to even fire, the session will be visibly stuck
       * at its last progressMessage rather than silently disappearing, which is diagnosable */
    })
  );
}

export async function POST(req: NextRequest) {
  const { sessionId, index } = (await req.json()) as { sessionId?: string; index?: number };

  if (!sessionId || typeof index !== "number") {
    return NextResponse.json({ error: "Requête invalide : sessionId ou index manquant." }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  const work = await getWork<SessionWorkData>(sessionId);
  if (!work) return NextResponse.json({ error: "Données de transcription introuvables (relance l'analyse)." }, { status: 404 });

  const seg = work.callSegments[index];
  if (!seg) return NextResponse.json({ error: "Segment introuvable pour cet index." }, { status: 404 });

  const isLast = index === work.callSegments.length - 1;
  const origin = req.nextUrl.origin;

  try {
    const lines: TranscriptLine[] = work.transcriptSegments
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

    const callId = `CALL-${sessionId}-${String(index + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;

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
      audioUrl: work.audioUrl,
      analysisNote:
        analysis?.analysisNote ?? "Analyse indisponible : ce call sera marqué comme échoué et peut être relancé individuellement.",
    };

    await saveCall(call);

    const allCalls = await listCalls(sessionId);

    let updatedSession: SessionRecord = {
      ...session,
      callIds: allCalls.map((c) => c.id),
      stats: computeStats(allCalls),
      status: isLast ? "saving" : "analyzing",
      progressMessage: isLast ? "05 — SAVING" : `04 — ANALYZING CALL ${index + 2} / ${work.callSegments.length}`,
    };
    await saveSession(updatedSession);

    if (isLast) {
      updatedSession = { ...updatedSession, status: "ready", progressMessage: null };
      await saveSession(updatedSession);
      await deleteWork(sessionId);
    } else {
      scheduleNextCall(origin, sessionId, index + 1);
    }

    return NextResponse.json({ call, session: updatedSession, done: isLast });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur pendant l'analyse de cet appel.";
    // Keep the chain alive even when this hop hit an unexpected storage/network error —
    // otherwise a single transient failure would leave the session stuck at "analyzing"
    // forever with no visible error.
    if (!isLast) {
      scheduleNextCall(origin, sessionId, index + 1);
    } else {
      await saveSession({ ...session, status: "error", error: message, progressMessage: null }).catch(() => {});
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
