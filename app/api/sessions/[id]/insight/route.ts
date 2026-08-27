import { NextRequest, NextResponse } from "next/server";
import { getSession, listCalls, saveSession } from "@/lib/storage";
import { analyzeSession } from "@/lib/ai/openai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(params.id);
  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  const calls = await listCalls(params.id);
  const summaryText = calls
    .map(
      (c) =>
        `Call ${c.id} — outcome: ${c.outcome}, interest: ${c.interestScore}/10, threeTens avg: ${c.threeTens.average}/10\nSummary: ${c.summary}\nObjections: ${c.objections.join(", ") || "none"}\nMistakes: ${c.salespersonMistakes.join(", ") || "none"}`
    )
    .join("\n\n");

  const insight = await analyzeSession(summaryText);

  const updated = {
    ...session,
    stats: {
      ...session.stats,
      sessionScore: insight.sessionScore,
      topObjection: insight.topObjection ?? session.stats.topObjection,
      mainIssue: insight.mainIssue,
      improvementTip: insight.improvementTip,
    },
  };
  await saveSession(updated);

  return NextResponse.json({ session: updated });
}
