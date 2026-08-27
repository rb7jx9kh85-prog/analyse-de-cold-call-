import { put, del, get, list, rename } from "@vercel/blob";
import type { CallRecord, SessionRecord } from "./types";

const token = () => process.env.BLOB_READ_WRITE_TOKEN;

function jsonOpts() {
  return {
    access: "private" as const,
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
    token: token(),
  };
}

async function putJson(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), jsonOpts());
}

async function getJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, { access: "private", token: token() });
    if (!result || result.statusCode !== 200) return null;
    return (await new Response(result.stream).json()) as T;
  } catch {
    return null;
  }
}

export async function saveSession(session: SessionRecord): Promise<void> {
  await putJson(`sessions/${session.id}.json`, session);
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  return getJson<SessionRecord>(`sessions/${id}.json`);
}

export async function listSessions(): Promise<SessionRecord[]> {
  const { blobs } = await list({ prefix: "sessions/", token: token() });
  const sessions = await Promise.all(
    blobs.filter((b) => b.pathname.endsWith(".json")).map((b) => getJson<SessionRecord>(b.pathname))
  );
  return sessions
    .filter((s): s is SessionRecord => s !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteSession(id: string): Promise<void> {
  await del(`sessions/${id}.json`, { token: token() });
}

export async function saveCall(call: CallRecord): Promise<void> {
  await putJson(`calls/${call.id}.json`, call);
}

export async function getCall(id: string): Promise<CallRecord | null> {
  return getJson<CallRecord>(`calls/${id}.json`);
}

export async function listCalls(sessionId?: string): Promise<CallRecord[]> {
  const { blobs } = await list({ prefix: "calls/", token: token() });
  const calls = await Promise.all(
    blobs.filter((b) => b.pathname.endsWith(".json")).map((b) => getJson<CallRecord>(b.pathname))
  );
  const valid = calls.filter((c): c is CallRecord => c !== null);
  const filtered = sessionId ? valid.filter((c) => c.sessionId === sessionId) : valid;
  return filtered.sort((a, b) => a.startTime - b.startTime);
}

export async function deleteCall(id: string): Promise<void> {
  await del(`calls/${id}.json`, { token: token() });
}

export async function saveWork(sessionId: string, data: unknown): Promise<void> {
  await putJson(`work/${sessionId}.json`, data);
}

export async function getWork<T>(sessionId: string): Promise<T | null> {
  return getJson<T>(`work/${sessionId}.json`);
}

export async function deleteWork(sessionId: string): Promise<void> {
  try {
    await del(`work/${sessionId}.json`, { token: token() });
  } catch {
    /* transient working data — safe to ignore if already gone */
  }
}

/** Sanitizes a path segment: strips slashes and traversal sequences. */
export function sanitizeSegment(segment: string): string {
  return segment.replace(/[\\/]/g, "_").replace(/\.\./g, "_").trim() || "file";
}

export function tempAudioPathname(sessionId: string, filename: string): string {
  return `tmp-upload/${sanitizeSegment(sessionId)}/${sanitizeSegment(filename)}`;
}

export function audioPathname(sessionId: string, filename: string): string {
  return `audio/${sanitizeSegment(sessionId)}/${sanitizeSegment(filename)}`;
}

/**
 * Moves a client-uploaded (necessarily public — the Blob client-upload SDK
 * doesn't expose a private option) temp file into the private audio store,
 * server-side, without pulling the bytes through this function.
 */
export async function finalizeAudioUpload(sessionId: string, filename: string, contentType: string): Promise<string> {
  const from = tempAudioPathname(sessionId, filename);
  const to = audioPathname(sessionId, filename);
  await rename(from, to, {
    access: "private",
    contentType: contentType || "audio/mpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: token(),
  });
  return to;
}

export async function readAudio(pathname: string, rangeHeader?: string | null) {
  const result = await get(pathname, {
    access: "private",
    token: token(),
    headers: rangeHeader ? { Range: rangeHeader } : undefined,
  });
  if (!result || result.statusCode !== 200) return null;
  return result;
}

export async function deleteAudio(sessionId: string): Promise<void> {
  const { blobs } = await list({ prefix: `audio/${sanitizeSegment(sessionId)}/`, token: token() });
  await Promise.all(blobs.map((b) => del(b.url, { token: token() })));
}
