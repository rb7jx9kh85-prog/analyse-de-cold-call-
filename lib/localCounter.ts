export interface LocalCallEntry {
  id: string;
  result: "yes" | "no" | "no_answer";
  at: string;
}

const KEY = "alpinia_local_calls";

export function getLocalCalls(): LocalCallEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalCallEntry[]) : [];
  } catch {
    return [];
  }
}

export function addLocalCall(result: LocalCallEntry["result"]): LocalCallEntry[] {
  const entries = getLocalCalls();
  const entry: LocalCallEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, result, at: new Date().toISOString() };
  const updated = [...entries, entry];
  window.localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function todayLocalCalls(): LocalCallEntry[] {
  const today = new Date().toDateString();
  return getLocalCalls().filter((e) => new Date(e.at).toDateString() === today);
}
