import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession, listCalls, deleteCall, deleteAudio } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(params.id);
  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  const calls = await listCalls(params.id);
  return NextResponse.json({ session, calls });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const calls = await listCalls(params.id);
  await Promise.all(calls.map((c) => deleteCall(c.id)));
  await deleteAudio(params.id);
  await deleteSession(params.id);
  return NextResponse.json({ ok: true });
}
