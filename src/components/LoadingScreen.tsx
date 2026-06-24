import { useEffect, useState } from "react";
import { NexusLoader } from "./NexusLoader";

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  const phases = [
    "LOADING EXA CORRELATION MATRIX",
    "CALIBRATING 4-LOCKS GATE",
    "SYNCING MULTI-ASSET FEED",
    "ARMING CONFLUENCE ENGINE",
    "NEXUS ONLINE",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((prev) => {
        if (prev >= phases.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setIsHidden(true);
            setTimeout(onComplete, 600);
          }, 400);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [onComplete, phases.length]);

  return (
    <div
      className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black transition-opacity duration-600 ${
        isHidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="text-5xl font-black tracking-[0.4rem] mb-14 text-[#D48A3C] drop-shadow-[0_0_30px_rgba(212,138,60,0.3)]">
        WARROOM NEXUS
      </div>

      <NexusLoader size={28} gap={6} />

      <div className="mt-10 text-[10px] font-mono tracking-[0.25em] text-[#D48A3C]/60 uppercase">
        {phases[phase]}
      </div>

      <div className="mt-3 text-[9px] font-mono text-white/15">
        {phase + 1} / {phases.length}
      </div>
    </div>
  );
};
