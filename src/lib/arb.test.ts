import { describe, it, expect } from "vitest";
import {
  computeTheoreticalArb, verifyExecutableBasket, computeNetEdge, evaluateEvent,
  type CandidateEvent, type CandidateMarket, type OrderBook, type BookLevel,
  FRESH_MS,
} from "./arb";

// ── factories ────────────────────────────────────────────────────────────────
function mkMarket(id: string, q: string, yesPrice: number, o: Partial<CandidateMarket> = {}): CandidateMarket {
  return {
    id, question: q, yesTokenId: `${id}-Y`, noTokenId: `${id}-N`,
    yesPrice, noPrice: Math.round((1 - yesPrice) * 1000) / 1000,
    liquidity: 100_000, enableOrderBook: true, acceptingOrders: true,
    feesEnabled: false, feeRateBps: 0, ...o,
  };
}
function mkEvent(markets: CandidateMarket[], o: Partial<CandidateEvent> = {}): CandidateEvent {
  return { id: "ev1", title: "Test event", negRisk: true, negRiskAugmented: false, negRiskOther: false, endDate: null, markets, ...o };
}
function mkBook(tokenId: string, asks: BookLevel[], o: Partial<OrderBook> = {}): OrderBook {
  return { tokenId, asks, timestamp: o.timestamp ?? Date.now(), hash: o.hash ?? "h", minOrderSize: o.minOrderSize ?? 1, tickSize: o.tickSize ?? 0.01 };
}
function books(...bs: OrderBook[]): Map<string, OrderBook> {
  return new Map(bs.map((b) => [b.tokenId, b]));
}

// ── 1. theoretical ───────────────────────────────────────────────────────────
describe("computeTheoreticalArb", () => {
  it("Σyes .90 → BUY_ALL_YES", () => {
    const t = computeTheoreticalArb(mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.45)]));
    expect(t.arbType).toBe("BUY_ALL_YES");
    expect(t.theoreticalCostPerShare).toBeCloseTo(0.9, 6);
    expect(t.payoutPerShare).toBe(1);
    expect(t.theoreticalReturnPct).toBeCloseTo(11.11, 1);
  });

  it("Σyes 1.10, N=3 → BUY_ALL_NO", () => {
    const t = computeTheoreticalArb(mkEvent([mkMarket("a", "A", 0.40), mkMarket("b", "B", 0.40), mkMarket("c", "C", 0.30)]));
    expect(t.arbType).toBe("BUY_ALL_NO");
    expect(t.sumYes).toBeCloseTo(1.10, 6);
    expect(t.payoutPerShare).toBe(2);            // N-1
    expect(t.theoreticalCostPerShare).toBeCloseTo(1.90, 6); // N-Σyes
  });

  it("Σyes 1.00 → NO_EDGE (no arbType)", () => {
    const t = computeTheoreticalArb(mkEvent([mkMarket("a", "A", 0.50), mkMarket("b", "B", 0.50)]));
    expect(t.arbType).toBeNull();
  });

  it("single leg / degenerate → no arb", () => {
    expect(computeTheoreticalArb(mkEvent([mkMarket("a", "A", 0.4)])).arbType).toBeNull();
  });
});

// ── 2. classification end-to-end ──────────────────────────────────────────────
describe("computeNetEdge classification", () => {
  it("fresh, fillable, net-positive → LIVE_EDGE", () => {
    const ev = mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.45)]);
    const t = computeTheoreticalArb(ev);
    const bk = books(mkBook("a-Y", [{ price: 0.45, size: 100 }]), mkBook("b-Y", [{ price: 0.45, size: 100 }]));
    const exec = verifyExecutableBasket(ev, t, bk, Date.now());
    const edge = computeNetEdge(ev, t, exec, 50);
    expect(edge.status).toBe("LIVE_EDGE");
    expect(edge.netProfitUsd!).toBeGreaterThan(0);
    expect(edge.executableCost!).toBeCloseTo(90, 0);
  });

  it("stale book can NEVER be LIVE → STALE_DATA", () => {
    const ev = mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.45)]);
    const t = computeTheoreticalArb(ev);
    const old = Date.now() - (FRESH_MS + 60_000);
    const bk = books(mkBook("a-Y", [{ price: 0.45, size: 100 }], { timestamp: old }), mkBook("b-Y", [{ price: 0.45, size: 100 }], { timestamp: old }));
    const edge = computeNetEdge(ev, t, verifyExecutableBasket(ev, t, bk, Date.now()), 50);
    expect(edge.status).toBe("STALE_DATA");
    expect(edge.status).not.toBe("LIVE_EDGE");
  });

  it("missing orderbook → THEORETICAL_EDGE, never LIVE", () => {
    const ev = mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.45)]);
    const edge = evaluateEvent(ev, null, 50);
    expect(edge.status).toBe("THEORETICAL_EDGE");
  });

  it("augmented / 'Other' universe → AUGMENTED_WATCH", () => {
    const ev = mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.45)], { negRiskAugmented: true });
    const edge = evaluateEvent(ev, null, 50);
    expect(edge.status).toBe("AUGMENTED_WATCH");
  });

  it("profitable size below min order size → INSUFFICIENT_DEPTH", () => {
    const ev = mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.45)]);
    const t = computeTheoreticalArb(ev);
    const bk = books(
      mkBook("a-Y", [{ price: 0.45, size: 5 }], { minOrderSize: 50 }),
      mkBook("b-Y", [{ price: 0.45, size: 5 }], { minOrderSize: 50 }),
    );
    const edge = computeNetEdge(ev, t, verifyExecutableBasket(ev, t, bk, Date.now()), 50);
    expect(edge.status).toBe("INSUFFICIENT_DEPTH");
    expect(edge.maxExecutableShares).toBe(5); // capacity reduced to real depth
  });

  it("displayed arb that doesn't survive the walk → THEORETICAL_EDGE", () => {
    // Gamma says Σyes 0.90, but the real asks are expensive (marginal ≥ payout).
    const ev = mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.45)]);
    const t = computeTheoreticalArb(ev);
    const bk = books(mkBook("a-Y", [{ price: 0.55, size: 100 }]), mkBook("b-Y", [{ price: 0.55, size: 100 }]));
    const edge = computeNetEdge(ev, t, verifyExecutableBasket(ev, t, bk, Date.now()), 50);
    expect(edge.status).toBe("THEORETICAL_EDGE");
  });
});

// ── 3. execution correctness ──────────────────────────────────────────────────
describe("verifyExecutableBasket execution truth", () => {
  it("BUY_ALL_NO walks real NO asks, NOT 1−YES", () => {
    // yes 0.40 each ⇒ 1−yes = 0.60, but NO asks are cheaper at 0.55.
    const ev = mkEvent([mkMarket("a", "A", 0.40), mkMarket("b", "B", 0.40), mkMarket("c", "C", 0.40)]);
    const t = computeTheoreticalArb(ev);
    expect(t.arbType).toBe("BUY_ALL_NO");
    const bk = books(
      mkBook("a-N", [{ price: 0.55, size: 100 }]),
      mkBook("b-N", [{ price: 0.55, size: 100 }]),
      mkBook("c-N", [{ price: 0.55, size: 100 }]),
    );
    const exec = verifyExecutableBasket(ev, t, bk, Date.now())!;
    expect(exec.legSide).toBe("NO");
    // fill price reflects the 0.55 NO asks, not the 0.60 implied by 1−YES.
    exec.perLegFill.forEach((p) => expect(p).toBeCloseTo(0.55, 6));
  });

  it("walks cheapest-first after a LOCAL ascending sort (CLOB order untrusted)", () => {
    // Leg A asks given DESCENDING; only the cheap level should bind A's fill.
    const ev = mkEvent([mkMarket("a", "A", 0.45), mkMarket("b", "B", 0.40)]);
    const t = computeTheoreticalArb(ev);
    const bk = books(
      mkBook("a-Y", [{ price: 0.55, size: 1000 }, { price: 0.40, size: 1000 }]), // unsorted
      mkBook("b-Y", [{ price: 0.40, size: 1000 }]),                              // caps capacity at 1000
    );
    const exec = verifyExecutableBasket(ev, t, bk, Date.now())!;
    // B exhausts at 1000 shares; A should have been filled from its 0.40 level, not 0.55.
    expect(exec.shares).toBeCloseTo(1000, 0);
    expect(exec.perLegFill[0]).toBeCloseTo(0.40, 6);
  });
});
