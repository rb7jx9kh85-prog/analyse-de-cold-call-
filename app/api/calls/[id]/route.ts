import { NextRequest, NextResponse } from "next/server";
import { getCall, saveCall, deleteCall, getSession, saveSession, listCalls } from "@/lib/storage";

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
    const yes = remaining.filter((c) => ["accepted", "interested", "send_mockup", "send_email", "send_whatsapp", "meeting"].includes(c.outcome)).length;
    const no = remaining.filter((c) => ["not_interested", "wrong_number", "gatekeeper"].includes(c.outcome)).length;
    const noAnswer = remaining.filter((c) => c.outcome === "no_answer").length;
    const callback = remaining.filter((c) => c.outcome === "callback").length;
    await saveSession({
      ...session,
      callIds: remaining.map((c) => c.id),
      stats: {
        ...session.stats,
        totalCalls: remaining.length,
        yes,
        no,
        noAnswer,
        callback,
        positiveRate: remaining.length ? Math.round((yes / remaining.length) * 100) : 0,
        answerRate: remaining.length ? Math.round(((remaining.length - noAnswer) / remaining.length) * 100) : 0,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
