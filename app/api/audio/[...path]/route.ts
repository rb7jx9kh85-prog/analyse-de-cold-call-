import { NextRequest, NextResponse } from "next/server";
import { readAudio } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathname = `audio/${params.path.join("/")}`;

  try {
    const range = req.headers.get("range");
    const result = await readAudio(pathname, range);
    if (!result) {
      return NextResponse.json({ error: "Audio introuvable." }, { status: 404 });
    }

    const upstreamStatus = result.headers.get("content-range") ? 206 : 200;
    const headers = new Headers();
    headers.set("Content-Type", result.headers.get("content-type") ?? "audio/mpeg");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, no-store");
    const contentLength = result.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    const contentRange = result.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    return new Response(result.stream, { status: upstreamStatus, headers });
  } catch {
    return NextResponse.json({ error: "Audio introuvable." }, { status: 404 });
  }
}
