import { useState, useEffect, useRef } from "react";
import type { ArbEdge } from "@/lib/arb";

export interface EdgesScanned {
  events: number; negRiskEvents: number; candidates: number;
  theoretical: number; executable: number; live: number; rejected: number;
}
export interface EdgesRejectedSummary {
  insufficientDepth: number; augmented: number; staleBook: number; theoreticalOnly: number;
}
export interface EdgesResponse {
  fetchedAt: number; scanId: string; dataMode: string;
  scanned: EdgesScanned; edges: ArbEdge[]; closest: ArbEdge[]; rejectedSummary: EdgesRejectedSummary;
}
export interface EdgesState {
  edges: ArbEdge[]; closest: ArbEdge[]; scanned: EdgesScanned | null;
  rejectedSummary: EdgesRejectedSummary | null; fetchedAt: number | null; dataMode: string | null;
  loading: boolean; refreshing: boolean; error: string | null; stale: boolean; lastGoodAt: number | null;
}

const INIT: EdgesState = {
  edges: [], closest: [], scanned: null, rejectedSummary: null, fetchedAt: null, dataMode: null,
  loading: true, refreshing: false, error: null, stale: false, lastGoodAt: null,
};

// Polls /api/edges. On error it KEEPS the last good edges (never blanks the screen)
// and flips `stale` so the UI can say "scanner unavailable — last good scan Xm ago".
export function useEdges(stake: number): EdgesState {
  const [state, setState] = useState<EdgesState>(INIT);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const stakeRef = useRef(stake);
  stakeRef.current = stake;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      ctrl.current?.abort();
      const ac = new AbortController();
      ctrl.current = ac;
      setState((p) => ({ ...p, refreshing: !p.loading }));
      try {
        const r = await fetch(`/api/edges?stake=${Math.round(stakeRef.current)}`, { signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: EdgesResponse = await r.json();
        if (!alive) return;
        setState({
          edges: d.edges ?? [], closest: d.closest ?? [], scanned: d.scanned ?? null,
          rejectedSummary: d.rejectedSummary ?? null, fetchedAt: d.fetchedAt, dataMode: d.dataMode,
          loading: false, refreshing: false, error: null, stale: false, lastGoodAt: d.fetchedAt,
        });
      } catch (e) {
        if (!alive || (e as { name?: string })?.name === "AbortError") return;
        setState((p) => ({ ...p, loading: false, refreshing: false, error: String(e), stale: true }));
      }
    };
    load();
    timer.current = setInterval(load, 30_000);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); ctrl.current?.abort(); };
  }, []);

  return state;
}
