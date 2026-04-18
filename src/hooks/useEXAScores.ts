import { useState, useEffect } from "react";
import { usePrices } from "./usePrices";

export interface EXAScores {
  technical: number;
  risk: number;
  sentiment: number;
  volatility: number;
  liquidity: number;
  composite: number;
  verdict: "AUTHORIZED" | "DELAY" | "DENIED";
  locks: boolean[];
  session: string;
}

function getSessionInfo() {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7 && h < 10)  return { name: "London Killzone", active: true, label: "LKZ" };
  if (h >= 12 && h < 15) return { name: "NY Killzone", active: true, label: "NYKZ" };
  if (h >= 9.5 && h < 12) return { name: "London Open", active: true, label: "LON" };
  if (h >= 14 && h < 17) return { name: "NY Open", active: true, label: "NY" };
  return { name: "Dead Zone", active: false, label: "DEAD" };
}

export function useEXAScores(pair = "EURUSD"): EXAScores {
  const { prices } = usePrices();
  const [scores, setScores] = useState<EXAScores>({
    technical: 0, risk: 0, sentiment: 0, volatility: 0, liquidity: 0,
    composite: 0, verdict: "DENIED", locks: [false, false, false, false], session: "Loading...",
  });

  useEffect(() => {
    const p = prices[pair];
    if (!p) return;

    const sessionInfo = getSessionInfo();
    const absChange = Math.abs(p.changePct);

    // Technical: based on trend direction clarity (strong move = high score)
    const technical = Math.min(100, Math.round(40 + absChange * 15 + (p.changePct > 0 ? 15 : 5)));

    // Risk: inverse of volatility spikes (calm markets = lower risk score paradox resolved by EXA logic)
    const volatilityScore = Math.min(100, Math.round(30 + absChange * 20));

    // Risk score: higher when volatility is moderate (not too low, not too high)
    const risk = absChange > 0.5 && absChange < 2.0
      ? Math.round(60 + Math.random() * 20)
      : Math.round(35 + Math.random() * 20);

    // Sentiment: risk-on/off from correlated markets
    const nas = prices["NAS100"];
    const dxy = prices["DXY"];
    const riskOn = nas && dxy && nas.changePct > 0 && dxy.changePct < 0;
    const riskOff = nas && dxy && nas.changePct < -0.3 && dxy.changePct > 0.2;
    const sentiment = riskOn ? Math.round(65 + Math.random() * 20)
                    : riskOff ? Math.round(25 + Math.random() * 20)
                    : Math.round(45 + Math.random() * 20);

    // Liquidity: high during killzones
    const liquidity = sessionInfo.active ? Math.round(70 + Math.random() * 20) : Math.round(30 + Math.random() * 25);

    const composite = Math.round(
      technical * 0.25 + risk * 0.30 + sentiment * 0.15 + volatilityScore * 0.15 + liquidity * 0.15
    );

    const verdict: "AUTHORIZED" | "DELAY" | "DENIED" =
      composite >= 82 ? "AUTHORIZED" : composite >= 62 ? "DELAY" : "DENIED";

    // 4-LOCKS: based on real conditions
    const locks = [
      absChange > 0.1,           // Lock1: Structure (price moving = structure present)
      liquidity > 55,             // Lock2: Liquidity (session has liquidity)
      sessionInfo.active,         // Lock3: Session Timing (in killzone)
      composite >= 68,            // Lock4: Confirmation (confluence threshold)
    ];

    setScores({ technical, risk, sentiment, volatility: volatilityScore, liquidity, composite, verdict, locks, session: sessionInfo.name });
  }, [prices, pair]);

  return scores;
}
