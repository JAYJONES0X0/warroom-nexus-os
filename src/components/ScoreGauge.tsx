import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number;
  label: string;
  weight: string;
  size?: number;
}

export const ScoreGauge = ({ score, label, weight, size = 110 }: ScoreGaugeProps) => {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1000;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimated(Math.round(eased * score));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animated / 100) * circumference;

  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const glow = score >= 80;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={6}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.05s",
              filter: glow ? `drop-shadow(0 0 6px ${color})` : "none",
            }}
          />
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-black tabular-nums"
            style={{ color, textShadow: glow ? `0 0 12px ${color}` : "none" }}
          >
            {animated}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-black text-white/80 uppercase tracking-wider">{label}</div>
        <div className="text-[10px] text-white/35 font-mono mt-0.5">{weight}</div>
      </div>
    </div>
  );
};
