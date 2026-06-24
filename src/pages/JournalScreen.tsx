import { useState, useEffect, useCallback } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { useWarroom } from "@/context/WarroomStateContext";
import journalTexture from "@/assets/textures/real_earth_daymap.jpg";

interface JournalEntry {
  id: string;
  date: string;
  asset: string;
  side: "BUY" | "SELL";
  resultR: number;
  note: string;
  tags: string[];
  source?: "manual" | "command" | "markets" | "polymarket";
}

const JRN_KEY = "warroom.journal";
const INITIAL: JournalEntry[] = [
  { id: "1", date: "2026-04-17", asset: "EUR/USD", side: "BUY", resultR: 2.8, note: "Clean BOS on H4. Entered on FVG retest at London open. SL swept clean.", tags: ["BOS", "FVG", "London"] },
  { id: "2", date: "2026-04-16", asset: "XAU/USD", side: "SELL", resultR: 4.1, note: "Textbook OB retest. All 4 locks confirmed. ARCHON signal triggered.", tags: ["OB", "4-LOCKS", "ARCHON"] },
  { id: "3", date: "2026-04-15", asset: "GBP/USD", side: "BUY", resultR: -1.0, note: "Entered too early before confirmation. Lock4 missing. Wait for displacement.", tags: ["LESSON", "Lock4"] },
  { id: "4", date: "2026-04-14", asset: "NAS100", side: "SELL", resultR: 1.9, note: "NY open rejection. Daily bearish OB + liquid sweep confluence.", tags: ["NY", "OB", "Sweep"] },
];

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JRN_KEY);
    return raw ? JSON.parse(raw) : INITIAL;
  } catch { return INITIAL; }
}

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "GBP/JPY", "AUD/USD", "NZD/USD", "XAU/USD", "BTC/USD", "NAS100", "SPX500", "DXY"];

const JournalScreen = () => {
  const { state } = useWarroom();
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries);
  const [quickNote, setQuickNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterAsset, setFilterAsset] = useState("");
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), asset: "EUR/USD", side: "BUY" as "BUY" | "SELL", resultR: "", note: "", tags: "" });
  const draft = state.journalDraft;
  const filteredEntries = filterAsset ? entries.filter(e => e.asset === filterAsset) : entries;

  useEffect(() => {
    try { localStorage.setItem(JRN_KEY, JSON.stringify(entries)); } catch { /* silent */ }
  }, [entries]);

  const saveQuickNote = () => {
    if (!quickNote.trim()) return;
    const entry: JournalEntry = { id: `qn-${Date.now()}`, date: new Date().toISOString().slice(0, 10), asset: "NOTE", side: "BUY", resultR: 0, note: quickNote.trim(), tags: ["quick"] };
    setEntries(prev => [entry, ...prev]);
    setQuickNote("");
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const saveForm = () => {
    const r = parseFloat(form.resultR);
    if (isNaN(r) || !form.note.trim()) return;
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const entry: JournalEntry = { id: editing ?? `j-${Date.now()}`, date: form.date, asset: form.asset, side: form.side, resultR: r, note: form.note.trim(), tags };
    if (editing) {
      setEntries(prev => prev.map(e => e.id === editing ? entry : e));
    } else {
      setEntries(prev => [entry, ...prev]);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ date: new Date().toISOString().slice(0, 10), asset: "EUR/USD", side: "BUY", resultR: "", note: "", tags: "" });
  };

  const startEdit = (e: JournalEntry) => {
    setForm({ date: e.date, asset: e.asset, side: e.side, resultR: String(e.resultR), note: e.note, tags: e.tags.join(", ") });
    setEditing(e.id);
    setShowForm(true);
  };

  const wins = entries.filter(e => e.resultR > 0).length;
  const losses = entries.filter(e => e.resultR < 0).length;
  const totalR = entries.reduce((s, e) => s + e.resultR, 0);
  const totalTrades = wins + losses;
  const winRate = totalTrades ? (wins / totalTrades * 100) : 0;
  const avgR = totalTrades ? totalR / totalTrades : 0;
  const maxWin = entries.length ? Math.max(...entries.map(e => e.resultR)) : 0;
  const maxLoss = entries.length ? Math.min(...entries.map(e => e.resultR)) : 0;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `warroom-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setEntries(data);
        }
      } catch { /* invalid file */ }
    };
    input.click();
  }, []);

  return (
    <PlanetPageLayout
      texture={journalTexture}
      glowColor="#10b981"
      bgColor="#030a18"
      screenName="TRADE JOURNAL"
      screenDesc="Session logs · R tracking · Pattern reinforcement · Psychological edge"
    >
      {/* ── Draft from Command ── */}
      {draft && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                PENDING DRAFT
              </span>
              <span className="text-[9px] text-white/40 font-mono">from Command · {new Date(draft.timestamp).toISOString().slice(0, 16).replace("T", " ")}</span>
            </div>
            <button onClick={() => {
              setForm({
                date: new Date().toISOString().slice(0, 10),
                asset: draft.asset.includes("/") ? draft.asset : `${draft.asset.slice(0, 3)}/${draft.asset.slice(3)}`,
                side: draft.direction === "LONG" ? "BUY" : "SELL",
                resultR: "",
                note: draft.notes || `Entry ${draft.entry} · Stop ${draft.stop} · TP1 ${draft.tp1}${draft.rr ? ` · R:R ${draft.rr}` : ""}`,
                tags: `command,${draft.session.toLowerCase().includes("kill") ? "killzone" : draft.session.toLowerCase().includes("ny") ? "ny" : ""}`,
              });
              setShowForm(true);
            }}
              className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded border transition-all"
              style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)" }}>
              ACCEPT DRAFT
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
            {[
              ["Asset", draft.asset],
              ["Direction", draft.direction],
              ["Entry/Stop/TP", `${draft.entry} / ${draft.stop} / ${draft.tp1}`],
              [draft.rr ? "R:R" : "Session", draft.rr ?? draft.session],
              ["Lots", draft.lots.toFixed(2)],
              ["Risk", `£${draft.riskAmount.toFixed(0)}`],
              ["Session", draft.session],
              ["Timeframe", draft.timeframe],
            ].map(([l, v]) => (
              <div key={l} className="card-surface p-2">
                <div className="text-[7px] text-white/25 uppercase tracking-wider">{l}</div>
                <div className="text-[10px] font-black text-white mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          ["Total Trades", String(entries.length), "white"],
          ["Total R", `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`, totalR >= 0 ? "#10b981" : "#ef4444"],
          ["Win Rate", totalTrades ? `${winRate.toFixed(0)}%` : "--", winRate >= 60 ? "#10b981" : "#f59e0b"],
          ["Avg R", totalTrades ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "--", avgR >= 0 ? "#10b981" : "#ef4444"],
        ].map(([l, v, c]) => (
          <div key={l} className="card-surface p-4 text-center">
            <div className="text-[10px] text-white/30 uppercase font-mono mb-1">{l}</div>
            <div className="text-xl font-black" style={{ color: c }}>{String(v)}</div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="flex items-center gap-4 mb-6 text-[10px] font-mono">
        <span className="text-white/30">Wins: <b className="text-emerald-400">{wins}</b></span>
        <span className="text-white/30">Losses: <b className="text-red-400">{losses}</b></span>
        <span className="text-white/30">Max Win: <b className="text-emerald-400">+{maxWin.toFixed(1)}R</b></span>
        <span className="text-white/30">Max Loss: <b className="text-red-400">{maxLoss.toFixed(1)}R</b></span>
        <div className="flex-1" />
        <button onClick={exportJSON} className="text-white/30 hover:text-white/60 px-2 py-1 rounded border border-white/[0.06]">EXPORT</button>
        <button onClick={importJSON} className="text-white/30 hover:text-white/60 px-2 py-1 rounded border border-white/[0.06]">IMPORT</button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-[8px] uppercase tracking-[0.2em] text-white/25 shrink-0">Filter</div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterAsset("")}
            className="text-[9px] font-mono px-2 py-1 rounded border transition-all"
            style={!filterAsset
              ? { color: "#10b981", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)" }
              : { color: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.06)", background: "transparent" }}>
            ALL
          </button>
          {ASSETS.map(a => (
            <button key={a} onClick={() => setFilterAsset(filterAsset === a ? "" : a)}
              className="text-[9px] font-mono px-2 py-1 rounded border transition-all"
              style={filterAsset === a
                ? { color: "#10b981", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)" }
                : { color: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.06)", background: "transparent" }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Add Entry button */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ date: new Date().toISOString().slice(0, 10), asset: "EUR/USD", side: "BUY", resultR: "", note: "", tags: "" }); }}
          className="w-full py-3 mb-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs border border-dashed border-white/[0.12] text-white/30 hover:text-white/60 hover:border-white/20 transition-all">
          + NEW ENTRY
        </button>
      )}

      {/* Entry Form */}
      {showForm && (
        <div className="card-surface p-5 mb-4">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-3">{editing ? "EDIT ENTRY" : "NEW ENTRY"}</div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25" />
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Asset</label>
              <select value={form.asset} onChange={(e) => setForm(f => ({ ...f, asset: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25">
                {ASSETS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Side</label>
              <select value={form.side} onChange={(e) => setForm(f => ({ ...f, side: e.target.value as "BUY" | "SELL" }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25">
                <option>BUY</option><option>SELL</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Result (R)</label>
              <input type="number" step="0.1" value={form.resultR} onChange={(e) => setForm(f => ({ ...f, resultR: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Notes</label>
            <textarea value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25 resize-none h-16" />
          </div>
          <div className="mb-3">
            <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveForm}
              className="flex-1 py-2.5 rounded-xl font-black uppercase tracking-[0.15em] text-xs border transition-all"
              style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }}>
              {editing ? "UPDATE ENTRY" : "ADD ENTRY"}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2.5 rounded-xl font-black text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-3 mb-6">
        {filteredEntries.map((e) => {
          const isNote = e.asset === "NOTE";
          return (
            <div key={e.id} className="card-surface p-5 transition-all hover:border-white/[0.10]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/25 font-mono">{e.date}</span>
                  {!isNote && <span className="text-sm font-black text-white">{e.asset}</span>}
                  {!isNote && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded"
                      style={{ background: e.side === "BUY" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: e.side === "BUY" ? "#10b981" : "#ef4444" }}>
                      {e.side}
                    </span>
                  )}
                  {isNote && <span className="text-[10px] text-white/25 font-mono italic">quick note</span>}
                  {e.source && e.source !== "manual" && (
                    <span className="text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-wider"
                      style={{ color: "#38bdf8", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}>
                      {e.source}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isNote && (
                    <span className="text-lg font-black" style={{ color: e.resultR >= 0 ? "#10b981" : "#ef4444" }}>
                      {e.resultR >= 0 ? "+" : ""}{e.resultR.toFixed(1)}R
                    </span>
                  )}
                  <button onClick={() => startEdit(e)} className="text-[9px] text-white/20 hover:text-white/50 px-1">E</button>
                  <button onClick={() => deleteEntry(e.id)} className="text-[9px] text-red-400/40 hover:text-red-400 px-1">X</button>
                </div>
              </div>
              <p className="text-xs text-white/40 font-mono mb-3 leading-relaxed">{e.note}</p>
              <div className="flex gap-2 flex-wrap">
                {e.tags.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] text-white/40 rounded">{t}</span>
                ))}
              </div>
            </div>
          );
        })}
        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-white/20 font-mono text-xs">{filterAsset ? `No entries for ${filterAsset}.` : "No entries yet. Add your first trade."}</div>
        )}
      </div>

      {/* Quick Note */}
      <div className="card-surface p-5">
        <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-3">QUICK NOTE</div>
        <textarea value={quickNote} onChange={(e) => setQuickNote(e.target.value)}
          placeholder="Log a thought, observation, or post-session reflection..."
          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:outline-none focus:border-white/25 resize-none h-24" />
        <button onClick={saveQuickNote}
          className="mt-3 px-5 py-2 bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs font-black uppercase tracking-wider rounded-lg hover:bg-white/[0.08] transition-all">
          SAVE NOTE
        </button>
      </div>
    </PlanetPageLayout>
  );
};

export default JournalScreen;
