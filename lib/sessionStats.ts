import type { CallRecord, SessionRecord } from "./types";
import { outcomeGroup } from "./types";
import { getSession, saveSession, listCalls } from "./storage";

export function emptyStats(): SessionRecord["stats"] {
  return {
    totalCalls: 0,
    yes: 0,
    no: 0,
    noAnswer: 0,
    callback: 0,
    positiveRate: 0,
    answerRate: 0,
    sessionScore: null,
    bestCallId: null,
    worstCallId: null,
    topObjection: null,
    mainIssue: null,
    improvementTip: null,
  };
}

export function computeStats(calls: CallRecord[]): SessionRecord["stats"] {
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

/** Recomputes and persists a session's call-derived stats from its current calls. Call this after any create/edit/retry/delete of a call so counts, rates, best/worst never drift. */
export async function refreshSessionStats(sessionId: string): Promise<SessionRecord | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  const calls = await listCalls(sessionId);
  const updated: SessionRecord = {
    ...session,
    callIds: calls.map((c) => c.id),
    stats: {
      ...computeStats(calls),
      sessionScore: session.stats.sessionScore,
      mainIssue: session.stats.mainIssue,
      improvementTip: session.stats.improvementTip,
    },
  };
  await saveSession(updated);
  return updated;
}
