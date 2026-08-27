import { NextRequest, NextResponse } from "next/server";
import { getCall, saveCall } from "@/lib/storage";
import { analyzeCall } from "@/lib/ai/openai";
import { refreshSessionStats } from "@/lib/sessionStats";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const call = await getCall(params.id);
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });

  const transcriptText = call.transcript.map((l) => `[${l.timestamp}] ${l.text}`).join("\n");
  const analysis = await analyzeCall(transcriptText, call.duration);

  const updated = {
    ...call,
    company: analysis.prospect.company,
    person: analysis.prospect.person,
    phone: analysis.prospect.phone,
    outcome: analysis.outcome,
    outcomeReason: analysis.outcomeReason,
    interestScore: analysis.interestScore,
    summary: analysis.summary,
    nextAction: analysis.nextAction,
    callbackAt: analysis.callbackAt,
    objections: analysis.objections,
    positiveSignals: analysis.positiveSignals,
    negativeSignals: analysis.negativeSignals,
    salespersonStrengths: analysis.salespersonStrengths,
    salespersonMistakes: analysis.salespersonMistakes,
    recommendedImprovement: analysis.recommendedImprovement,
    threeTens: analysis.threeTens,
    tonalities: analysis.tonalities,
    scriptScores: analysis.scriptScores,
    keyMoments: analysis.keyMoments,
    analysisNote: analysis.analysisNote,
  };

  await saveCall(updated);
  await refreshSessionStats(call.sessionId);
  return NextResponse.json({ call: updated });
}
