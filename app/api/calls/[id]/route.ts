import { NextRequest, NextResponse } from "next/server";
import { getCall, saveCall, deleteCall } from "@/lib/storage";
import { refreshSessionStats } from "@/lib/sessionStats";

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
  await refreshSessionStats(call.sessionId);
  return NextResponse.json({ call: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const call = await getCall(params.id);
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });

  try {
    await deleteCall(params.id);
  } catch (err) {
    return NextResponse.json(
      { error: `La suppression du call a échoué : ${err instanceof Error ? err.message : "erreur inconnue"}.` },
      { status: 500 }
    );
  }

  await refreshSessionStats(call.sessionId);
  return NextResponse.json({ ok: true });
}
