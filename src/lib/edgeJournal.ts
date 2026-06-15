// EDGE-OBSERVATION CACHE — starts the proof dataset now, before any execution.
//
// HONESTY NOTE: v1 is a browser-local localStorage *cache*, NOT audit-grade proof.
// It can be edited, cleared, or lost, and lives on one device. The real proof
// database (Supabase rows or signed/hashed snapshots) is an explicit later phase.
// What this gives us today: a running record of how often edge appears, how long it
// lasts, and how much capacity it carries — the questions that decide if the
// scanner is real. See [[project_arbedge_engine]].

import type { ArbEdge, EdgeStatus } from "./arb";

export interface EdgeObservation {
  edgeId: string;            // `${eventId}:${arbType}`
  eventId: string;
  title: string;
  arbType: string;
  status: EdgeStatus;        // latest seen
  bestStatus: EdgeStatus;    // best (most-confirmed) ever seen
  firstSeenAt: number;
  lastSeenAt: number;
  durationSec: number;
  bestNetReturnPct: number | null;
  lastTheoreticalReturnPct: number | null;
  bestCapacityUsd: number | null;
  legCount: number;
  bookHashes: string[];
  rejectedReasons: string[];
  timesSeen: number;
}

const KEY = "warroom.edges.v1";
const MAX = 300;

// Higher = more confirmed. Used to remember the *best* state an edge ever reached.
const RANK: Record<EdgeStatus, number> = {
  LIVE_EDGE: 7, EXECUTABLE_EDGE: 6, INSUFFICIENT_DEPTH: 5, STALE_DATA: 4,
  THEORETICAL_EDGE: 3, AUGMENTED_WATCH: 2, NO_EDGE: 1, REJECTED: 0,
};

function read(): EdgeObservation[] {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) as EdgeObservation[]; } catch { /* ignore */ }
  return [];
}
function write(arr: EdgeObservation[]) {
  try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX))); } catch { /* ignore */ }
}

export function getObservations(): EdgeObservation[] { return read(); }

// Upsert this scan's candidates (anything with a real arbType). Dedupe by edgeId,
// extend duration, and remember the best state/return/capacity ever observed.
export function observeEdges(edges: ArbEdge[]): EdgeObservation[] {
  const now = Date.now();
  const rec = read();
  const byId = new Map(rec.map((e) => [e.edgeId, e] as const));
  let changed = false;

  for (const e of edges) {
    if (!e.arbType) continue; // only log genuine candidates
    const edgeId = `${e.eventId}:${e.arbType}`;
    const prev = byId.get(edgeId);
    if (prev) {
      const betterStatus = RANK[e.status] > RANK[prev.bestStatus] ? e.status : prev.bestStatus;
      byId.set(edgeId, {
        ...prev,
        status: e.status,
        bestStatus: betterStatus,
        lastSeenAt: now,
        durationSec: Math.round((now - prev.firstSeenAt) / 1000),
        bestNetReturnPct: maxNullable(prev.bestNetReturnPct, e.netReturnPct),
        lastTheoreticalReturnPct: e.theoreticalReturnPct,
        bestCapacityUsd: maxNullable(prev.bestCapacityUsd, e.maxExecutableStakeUsd),
        bookHashes: e.bookHashes.length ? e.bookHashes : prev.bookHashes,
        rejectedReasons: e.rejectedReasons,
        timesSeen: prev.timesSeen + 1,
      });
    } else {
      byId.set(edgeId, {
        edgeId, eventId: e.eventId, title: e.eventTitle, arbType: e.arbType,
        status: e.status, bestStatus: e.status, firstSeenAt: now, lastSeenAt: now,
        durationSec: 0, bestNetReturnPct: e.netReturnPct, lastTheoreticalReturnPct: e.theoreticalReturnPct,
        bestCapacityUsd: e.maxExecutableStakeUsd, legCount: e.legCount,
        bookHashes: e.bookHashes, rejectedReasons: e.rejectedReasons, timesSeen: 1,
      });
    }
    changed = true;
  }
  if (!changed) return rec;
  const arr = [...byId.values()];
  write(arr);
  return arr;
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

export interface EdgeStats {
  observed: number;
  liveEverSeen: number;       // reached LIVE_EDGE at least once
  executableEverSeen: number; // reached EXECUTABLE_EDGE or better
  avgLiveDurationSec: number | null;
  bestNetReturnPct: number | null;
}

export function observationStats(obs: EdgeObservation[]): EdgeStats {
  const live = obs.filter((o) => o.bestStatus === "LIVE_EDGE");
  const exe = obs.filter((o) => RANK[o.bestStatus] >= RANK.EXECUTABLE_EDGE);
  const avgLive = live.length ? Math.round(live.reduce((s, o) => s + o.durationSec, 0) / live.length) : null;
  const bestNet = obs.reduce<number | null>((m, o) => maxNullable(m, o.bestNetReturnPct), null);
  return { observed: obs.length, liveEverSeen: live.length, executableEverSeen: exe.length, avgLiveDurationSec: avgLive, bestNetReturnPct: bestNet };
}
