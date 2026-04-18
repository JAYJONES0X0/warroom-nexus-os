import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import journalTexture from "@/assets/textures/journal-realistic.jpg";

const ENTRIES = [
  { date: "2026-04-17", asset: "EUR/USD", side: "BUY", result: "+2.8R", note: "Clean BOS on H4. Entered on FVG retest at London open. SL swept clean.", tags: ["BOS", "FVG", "London"] },
  { date: "2026-04-16", asset: "XAU/USD", side: "SELL", result: "+4.1R", note: "Textbook OB retest. All 4 locks confirmed. ARCHON signal triggered.", tags: ["OB", "4-LOCKS", "ARCHON"] },
  { date: "2026-04-15", asset: "GBP/USD", side: "BUY", result: "-1.0R", note: "Entered too early before confirmation. Lock4 missing. Wait for displacement.", tags: ["LESSON", "Lock4"] },
  { date: "2026-04-14", asset: "NAS100", side: "SELL", result: "+1.9R", note: "NY open rejection. Daily bearish OB + liquid sweep confluence.", tags: ["NY", "OB", "Sweep"] },
];

const JournalScreen = () => {
  const [note, setNote] = useState("");
  const totalR = ENTRIES.reduce((acc, e) => acc + parseFloat(e.result), 0);
  return (
    <PlanetPageLayout
      texture={journalTexture}
      glowColor="#c0c0c0"
      bgColor="#080808"
      screenName="TRADE JOURNAL"
      screenDesc="Session logs · R tracking · Pattern reinforcement · Psychological edge"
    >
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[["Entries", ENTRIES.length, "white"], ["Total R", "+" + totalR.toFixed(1) + "R", "#10b981"], ["Win Rate", "75%", "#10b981"], ["Avg R", "+1.95R", "white"]].map(([l, v, c]: any) => (
          <div key={l} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
            <div className="text-[10px] text-white/30 uppercase font-mono mb-1">{l}</div>
            <div className="text-xl font-black" style={{ color: c }}>{String(v)}</div>
          </div>
        ))}
      </div>
      <div className="space-y-3 mb-6">
        {ENTRIES.map((e, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/25 font-mono">{e.date}</span>
                <span className="text-sm font-black text-white">{e.asset}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: e.side === "BUY" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: e.side === "BUY" ? "#10b981" : "#ef4444" }}>{e.side}</span>
              </div>
              <span className="text-lg font-black" style={{ color: e.result.startsWith("+") ? "#10b981" : "#ef4444" }}>{e.result}</span>
            </div>
            <p className="text-xs text-white/40 font-mono mb-3 leading-relaxed">{e.note}</p>
            <div className="flex gap-2 flex-wrap">
              {e.tags.map((t) => <span key={t} className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] text-white/40 rounded">{t}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-3">QUICK NOTE</div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Log a thought, observation, or post-session reflection..."
          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:outline-none focus:border-white/25 resize-none h-24" />
        <button className="mt-3 px-5 py-2 bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs font-black uppercase tracking-wider rounded-lg hover:bg-white/[0.08] transition-all">
          SAVE NOTE
        </button>
      </div>
    </PlanetPageLayout>
  );
};

export default JournalScreen;
