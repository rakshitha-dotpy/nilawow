const KEY = "nilawow:recent-services";
const MAX = 14;

export function readRecentServices(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecentService(label: string): void {
  if (typeof window === "undefined") return;
  const t = label.trim();
  if (!t) return;
  const next = [t, ...readRecentServices().filter((x) => x !== t)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
