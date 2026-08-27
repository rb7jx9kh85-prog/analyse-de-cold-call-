import { NextResponse } from "next/server";
import { listSessions } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await listSessions();
  return NextResponse.json({ sessions });
}
