import { put, del, head, list } from "@vercel/blob";
import type { CallRecord, SessionRecord } from "./types";

function jsonOpts() {
  return {
    access: "public" as const,
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  };
}

export async function saveSession(session: SessionRecord): Promise<void> {
  await put(`sessions/${session.id}.json`, JSON.stringify(session), jsonOpts());
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  try {
    const meta = await head(`sessions/${id}.json`, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SessionRecord;
  } catch {
    return null;
  }
}

export async function listSessions(): Promise<SessionRecord[]> {
  const { blobs } = await list({ prefix: "sessions/", token: process.env.BLOB_READ_WRITE_TOKEN });
  const sessions = await Promise.all(
    blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map(async (b) => {
        try {
          const res = await fetch(b.url, { cache: "no-store" });
          if (!res.ok) return null;
          return (await res.json()) as SessionRecord;
        } catch {
          return null;
        }
      })
  );
  return sessions
    .filter((s): s is SessionRecord => s !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await del(`sessions/${id}.json`, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    /* noop */
  }
}

export async function saveCall(call: CallRecord): Promise<void> {
  await put(`calls/${call.id}.json`, JSON.stringify(call), jsonOpts());
}

export async function getCall(id: string): Promise<CallRecord | null> {
  try {
    const meta = await head(`calls/${id}.json`, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as CallRecord;
  } catch {
    return null;
  }
}

export async function listCalls(sessionId?: string): Promise<CallRecord[]> {
  const { blobs } = await list({ prefix: "calls/", token: process.env.BLOB_READ_WRITE_TOKEN });
  const calls = await Promise.all(
    blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map(async (b) => {
        try {
          const res = await fetch(b.url, { cache: "no-store" });
          if (!res.ok) return null;
          return (await res.json()) as CallRecord;
        } catch {
          return null;
        }
      })
  );
  const valid = calls.filter((c): c is CallRecord => c !== null);
  const filtered = sessionId ? valid.filter((c) => c.sessionId === sessionId) : valid;
  return filtered.sort((a, b) => a.startTime - b.startTime);
}

export async function deleteCall(id: string): Promise<void> {
  try {
    await del(`calls/${id}.json`, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    /* noop */
  }
}

export async function saveWork(sessionId: string, data: unknown): Promise<void> {
  await put(`work/${sessionId}.json`, JSON.stringify(data), jsonOpts());
}

export async function getWork<T>(sessionId: string): Promise<T | null> {
  try {
    const meta = await head(`work/${sessionId}.json`, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function deleteWork(sessionId: string): Promise<void> {
  try {
    await del(`work/${sessionId}.json`, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    /* noop */
  }
}

export async function uploadAudio(sessionId: string, filename: string, file: Buffer | Blob, contentType: string): Promise<string> {
  const blob = await put(`audio/${sessionId}/${filename}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType,
    allowOverwrite: true,
  });
  return blob.url;
}

export async function deleteAudio(sessionId: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: `audio/${sessionId}/`, token: process.env.BLOB_READ_WRITE_TOKEN });
    await Promise.all(blobs.map((b) => del(b.url, { token: process.env.BLOB_READ_WRITE_TOKEN })));
  } catch {
    /* noop */
  }
}
