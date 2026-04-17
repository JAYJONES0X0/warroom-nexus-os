export const TopBar = () => {
  return <div className="fixed top-0 left-0 w-full h-20 bg-black/70 backdrop-blur-xl border-b border-primary/20 flex items-center justify-between px-10 z-[100]">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-2xl font-black text-black shadow-[0_0_20px_rgba(212,165,116,0.4)]">
          ⚡
        </div>
        <div className="text-xl font-black tracking-[0.2rem] [text-shadow:0_0_10px_rgba(212,165,116,0.5)] text-secondary-foreground">
          WARROOM NEXUS
        </div>
      </div>
      <div className="flex items-center gap-5">
        <button className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center text-2xl hover:bg-primary/30 hover:border-primary/60 hover:-translate-y-0.5 transition-all">
          ⚙️
        </button>
        <button className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center text-2xl hover:bg-primary/30 hover:border-primary/60 hover:-translate-y-0.5 transition-all">
          🌙
        </button>
        <button className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-2xl text-black font-black hover:scale-110 hover:shadow-[0_0_30px_rgba(212,165,116,0.6)] transition-all">
          👤
        </button>
      </div>
    </div>;
};