import { useState, useEffect, useRef } from "react";
import { usePrices } from "@/hooks/usePrices";

interface ScreenAgentProps {
  agentId: string;
  agentRole: string;
  glowColor: string;
  systemContext: string;
  autoPrompt: string;
}

type LogEntry = { role: "user" | "agent"; text: string };

function getSession() {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7 && h < 10)  return "London Killzone";
  if (h >= 12 && h < 15) return "NY Killzone";
  if (h >= 0 && h < 7)   return "Asian Session";
  return "Dead Zone";
}

export const ScreenAgent = ({ agentId, agentRole, glowColor, systemContext, autoPrompt }: ScreenAgentProps) => {
  const { prices } = usePrices();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking" | "ready">("idle");
  const didAutoRun = useRef(false);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const call = async (userMsg: string) => {
    setStatus("thinking");
    setLog(prev => [...prev, { role: "user", text: userMsg }, { role: "agent", text: "" }]);

    const priceSnapshot = Object.entries(prices)
      .map(([k, v]) => `${k}: ${v.price.toFixed(4)} (${v.changePct >= 0 ? "+" : ""}${v.changePct.toFixed(2)}%)`)
      .join(", ");

    const enrichedSystem = `${systemContext}\n\nLive prices: ${priceSnapshot || "loading"}\nSession: ${getSession()}`;

    try {
      const res = await fetch("/api/nexus-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: enrichedSystem, message: userMsg }),
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const j = JSON.parse(raw);
            const token = j.choices?.[0]?.delta?.content ?? "";
            if (token) {
              setLog(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "agent", text: next[next.length - 1].text + token };
                return next;
              });
            }
          } catch { /* malformed chunk */ }
        }
      }
    } catch (e) {
      setLog(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "agent", text: `[Error: ${String(e)}]` };
        return next;
      });
    }
    setStatus("ready");
  };

  // Auto-run once when prices load
  useEffect(() => {
    if (didAutoRun.current || Object.keys(prices).length === 0) return;
    didAutoRun.current = true;
    call(autoPrompt);
  }, [prices]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || status === "thinking") return;
    setInput("");
    call(msg);
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "monospace" }}>
      {/* Agent header */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full"
          style={{ background: status === "thinking" ? glowColor : status === "ready" ? "#10b981" : "#ffffff20",
                   boxShadow: status === "thinking" ? `0 0 6px ${glowColor}` : "none",
                   animation: status === "thinking" ? "pulse 1s infinite" : "none" }} />
        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: glowColor }}>{agentId}</span>
        <span className="text-[8px] text-white/25 uppercase">{agentRole}</span>
        <span className="ml-auto text-[8px] text-white/15 uppercase">
          {status === "thinking" ? "ANALYZING..." : status === "ready" ? "READY" : "STANDBY"}
        </span>
      </div>

      {/* Log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1 space-y-2 text-[10px]" style={{ scrollbarWidth: "none" }}>
        {log.length === 0 && (
          <div className="text-white/15 font-mono text-center py-4">
            {agentId} initializing...
          </div>
        )}
        {log.map((entry, i) => (
          <div key={i} className={entry.role === "user" ? "text-right" : ""}>
            {entry.role === "user" ? (
              <span className="inline-block text-[9px] font-mono px-2 py-1 rounded-lg bg-white/[0.05] text-white/50 max-w-[85%]">
                {entry.text}
              </span>
            ) : (
              <div className="text-[10px] font-mono leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                {entry.text}
                {status === "thinking" && i === log.length - 1 && (
                  <span className="inline-block w-1 h-3 ml-0.5 align-middle animate-pulse" style={{ background: glowColor }} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-t border-white/[0.05] shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          placeholder={`Ask ${agentId}...`}
          disabled={status === "thinking"}
          className="flex-1 bg-transparent text-[10px] font-mono text-white/60 placeholder:text-white/15 focus:outline-none"
        />
        <button onClick={handleSend} disabled={status === "thinking" || !input.trim()}
          className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded transition-all"
          style={{ color: glowColor, background: `${glowColor}15`, opacity: input.trim() ? 1 : 0.3 }}>
          →
        </button>
      </div>
    </div>
  );
};
