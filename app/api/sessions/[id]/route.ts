import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession, listCalls, deleteCall, deleteAudio, deleteWork } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(params.id);
  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  const calls = await listCalls(params.id);
  return NextResponse.json({ session, calls });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const calls = await listCalls(params.id);

  const results = await Promise.allSettled([
    ...calls.map((c) => deleteCall(c.id)),
    deleteAudio(params.id),
    deleteWork(params.id),
  ]);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    return NextResponse.json(
      {
        error: `${failures.length} suppression(s) ont échoué (session conservée pour éviter de perdre la référence) : ${failures
          .map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
          .join("; ")}`,
      },
      { status: 500 }
    );
  }

  try {
    await deleteSession(params.id);
  } catch (err) {
    return NextResponse.json(
      { error: `La suppression de la session a échoué : ${err instanceof Error ? err.message : "erreur inconnue"}.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
