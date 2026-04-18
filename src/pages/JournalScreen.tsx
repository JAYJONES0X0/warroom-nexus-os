import { useState } from "react";
import { PlanetOrb } from "@/components/PlanetOrb";
import journalTexture from "@/assets/textures/journal-realistic.jpg";

const ENTRIES = [
  { date: "2026-04-17", asset: "EUR/USD", side: "BUY", result: "+2.8R", note: "Clean BOS on H4. Entered on FVG retest at London open. SL swept clean.", tags: ["BOS", "FVG", "London"] },
  { date: "2026-04-16", asset: "XAU/USD", side: "SELL", result: "+4.1R", note: "Textbook order block retest. All 4 locks confirmed. ARCHON signal triggered.", tags: ["OB", "4-LOCKS", "ARCHON"] },
  { date: "2026-04-15", asset: "GBP/USD", side: "BUY", result: "-1.0R", note: "Entered too early before confirmation. Lock4 was missing. Lesson: wait for displacement.", tags: ["LESSON", "Lock4"] },
  { date: "2026-04-14", asset: "NAS100", side: "SELL", result: "+1.9R", note: "NY open rejection. Confluence from daily bearish OB + liquid sweep.", tags: ["NY", "OB", "Sweep"] },
];

const JournalScreen = () => {
  const [note, setNote] = useState("");
  const totalR = ENTRIES.reduce((acc, e) => acc + parseFloat(e.result), 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-y-auto">
      <PlanetOrb texture={journalTexture} glowColor="#aaaaaa" label="NEXUS" />
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.3em] font-mono mb-1">WARROOM NEXUS</div>
        <div className="text-3xl font-black tracking-wider">TRADE JOURNAL</div>
        <div className="text-sm text-white/40 font-mono mt-1">Session logs · Psychological edge · Pattern reinforcement</div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Entries", value: `${ENTRIES.length}`, color: "text-white" },
            { label: "Total R", value: `+${totalR.toFixed(1)}R`, color: "text-emerald-400" },
            { label: "Win Rate", value: "75%", color: "text-emerald-400" },
            { label: "Avg R/Trade", value: "+1.95R", color: "text-white" },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-[10px] text-white/40 uppercase font-mono mb-1">{s.label}</div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Entries */}
        <div className="space-y-3">
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono">RECENT SESSIONS</div>
          {ENTRIES.map((e, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/30 font-mono">{e.date}</span>
                  <span className="text-sm font-black text-white">{e.asset}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${e.side === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{e.side}</span>
                </div>
                <span className={`text-lg font-black ${e.result.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>{e.result}</span>
              </div>
              <p className="text-xs text-white/50 font-mono mb-3 leading-relaxed">{e.note}</p>
              <div className="flex gap-2 flex-wrap">
                {e.tags.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400/70 rounded">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* New note */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-3">QUICK NOTE</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Log a thought, observation, or post-session note..."
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 resize-none h-24"
          />
          <button className="mt-3 px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider rounded-lg hover:bg-emerald-500/20 transition-all">
            SAVE NOTE
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalScreen;
