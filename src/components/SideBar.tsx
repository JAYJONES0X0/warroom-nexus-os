import { useState } from "react";

interface SideBarProps {
  side: "left" | "right";
  items: Array<{
    title: string;
    value: string;
    valueColor?: string;
  }>;
  icon: string;
  className?: string;
}

export const SideBar = ({ side, items, icon, className }: SideBarProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`fixed top-1/2 -translate-y-1/2 ${
        side === "left" ? "left-8" : "right-8"
      } ${
        expanded ? "w-[280px] px-5 py-8" : "w-[70px] py-5"
      } bg-primary/20 backdrop-blur-xl border border-primary/30 rounded-[35px] z-[90] transition-all duration-400`}
    >
      <div
        className="w-full h-12 flex items-center justify-center cursor-pointer text-2xl text-primary hover:scale-125 transition-all mb-3"
        onClick={() => setExpanded(!expanded)}
      >
        {icon}
      </div>
      {expanded && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-primary/20 hover:border-primary/50 hover:translate-x-1 transition-all"
            >
              <div className="text-xs font-bold text-primary mb-1 tracking-wider uppercase">
                {item.title}
              </div>
              <div
                className={`text-lg font-black ${
                  item.valueColor || "text-green-500"
                }`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
