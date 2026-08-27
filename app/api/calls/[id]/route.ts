import { NextRequest, NextResponse } from "next/server";
import { getCall, saveCall, deleteCall, getSession, saveSession, listCalls } from "@/lib/storage";
import { computeStats } from "@/lib/sessionStats";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const call = await getCall(params.id);
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });
  return NextResponse.json({ call });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const call = await getCall(params.id);
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });

  const body = await req.json();
  const allowed = ["company", "person", "outcome", "callbackAt", "outcomeReason"] as const;
  const updated = { ...call, edited: true };
  for (const key of allowed) {
    if (key in body) (updated as any)[key] = body[key];
  }

  await saveCall(updated);
  return NextResponse.json({ call: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const call = await getCall(params.id);
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });

  await deleteCall(params.id);

  const session = await getSession(call.sessionId);
  if (session) {
    const remaining = await listCalls(call.sessionId);
    await saveSession({
      ...session,
      callIds: remaining.map((c) => c.id),
      stats: { ...computeStats(remaining), sessionScore: session.stats.sessionScore, mainIssue: session.stats.mainIssue, improvementTip: session.stats.improvementTip },
    });
  }

  return NextResponse.json({ ok: true });
}
