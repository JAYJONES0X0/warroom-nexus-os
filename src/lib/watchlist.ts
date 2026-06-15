// Tiny persistent watchlist — the markets you're tracking. localStorage so it
// survives refreshes; one device only (same honesty caveat as the play journal).
const KEY = "warroom.watch.v1";

function read(): string[] {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) as string[]; } catch { /* ignore */ }
  return [];
}
function write(a: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(a.slice(-100))); } catch { /* ignore */ }
}

export function getWatch(): string[] { return read(); }
export function isWatched(id: string): boolean { return read().includes(id); }
export function toggleWatch(id: string): string[] {
  const a = read();
  const i = a.indexOf(id);
  if (i >= 0) a.splice(i, 1); else a.push(id);
  write(a);
  return a;
}
