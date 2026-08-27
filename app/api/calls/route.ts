import { NextRequest, NextResponse } from "next/server";
import { listCalls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") ?? undefined;
  const calls = await listCalls(sessionId);
  return NextResponse.json({ calls });
}
