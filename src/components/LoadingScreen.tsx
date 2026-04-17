import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 12;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsHidden(true);
            setTimeout(onComplete, 500);
          }, 500);
          return 100;
        }
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        isHidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="text-6xl font-black tracking-[0.5rem] mb-10 text-primary animate-pulse">
        WARROOM NEXUS
      </div>
      <div className="w-[400px] h-[6px] bg-primary/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 shadow-[0_0_20px_rgba(212,165,116,0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
