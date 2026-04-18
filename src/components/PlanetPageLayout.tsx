import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";

const SpinningPlanet = ({
  texture,
  scrollRef,
}: {
  texture: string;
  scrollRef: React.MutableRefObject<number>;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const tex = useTexture(texture);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.004;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.25) * 0.04;
    }
    if (groupRef.current) {
      const targetY = -scrollRef.current * 0.0012;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial map={tex} metalness={0.08} roughness={0.82} />
      </mesh>
    </group>
  );
};

interface PlanetPageLayoutProps {
  children: React.ReactNode;
  texture: string;
  glowColor: string;
  bgColor: string;
  screenName: string;
  screenDesc: string;
}

export const PlanetPageLayout = ({
  children,
  texture,
  glowColor,
  bgColor,
  screenName,
  screenDesc,
}: PlanetPageLayoutProps) => {
  const navigate = useNavigate();
  const scrollRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      scrollRef.current = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 80% 80% at 80% 50%, ${glowColor}18 0%, ${bgColor} 55%)`,
      }}
    >
      {/* Starfield ambient layer */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.4) 0%, transparent 0%),
            radial-gradient(1px 1px at 30% 70%, rgba(255,255,255,0.3) 0%, transparent 0%),
            radial-gradient(1px 1px at 50% 40%, rgba(255,255,255,0.4) 0%, transparent 0%),
            radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.25) 0%, transparent 0%),
            radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.35) 0%, transparent 0%)`,
        }}
      />

      {/* Large planet — fixed right, stays while content scrolls */}
      <div className="absolute right-0 top-0 w-[44vw] h-full flex items-center justify-center pointer-events-none z-0">
        <div className="relative" style={{ width: 440, height: 440 }}>
          {/* Outer atmosphere glow */}
          <div
            className="absolute rounded-full"
            style={{
              inset: "-30%",
              background: `radial-gradient(circle, ${glowColor}28 0%, ${glowColor}08 45%, transparent 70%)`,
            }}
          />
          {/* Ring accent (horizontal line through center for some planets) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 100px 30px ${glowColor}18, 0 0 200px 80px ${glowColor}08` }}
          />
          {/* Planet canvas */}
          <Canvas
            camera={{ position: [0, 0, 2.7], fov: 50 }}
            style={{ background: "transparent", width: 440, height: 440 }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={3.5} color="#ffffff" />
            <pointLight position={[-3, -2, 2]} intensity={0.8} color={glowColor} />
            <pointLight position={[0, 0, 8]} intensity={0.4} color="#ffffff" />
            <SpinningPlanet texture={texture} scrollRef={scrollRef} />
          </Canvas>
        </div>
      </div>

      {/* Left-right blend: content edge fades into planet side */}
      <div
        className="absolute top-0 h-full z-[5] pointer-events-none"
        style={{
          left: "54vw",
          width: "8vw",
          background: `linear-gradient(to right, ${bgColor}, transparent)`,
        }}
      />

      {/* Scrollable content — left 58% */}
      <div
        ref={contentRef}
        className="absolute left-0 top-0 w-[58vw] h-full overflow-y-auto z-10"
        style={{ scrollbarWidth: "thin", scrollbarColor: `${glowColor}30 transparent` }}
      >
        {/* Back to home */}
        <button
          onClick={() => navigate("/")}
          className="fixed top-5 left-6 z-20 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] transition-all hover:opacity-100 opacity-60 px-3 py-1.5 rounded-lg border"
          style={{ color: glowColor, borderColor: `${glowColor}30`, background: `${glowColor}08` }}
        >
          ← NEXUS
        </button>

        {/* Page header */}
        <div
          className="px-14 pt-20 pb-10 border-b"
          style={{ borderColor: `${glowColor}15` }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.35em] font-mono mb-2"
            style={{ color: `${glowColor}90` }}
          >
            WARROOM NEXUS
          </div>
          <h1
            className="text-4xl font-black tracking-wider text-white mb-3"
            style={{ textShadow: `0 0 40px ${glowColor}30` }}
          >
            {screenName}
          </h1>
          <p className="text-sm text-white/35 font-mono leading-relaxed">{screenDesc}</p>

          {/* Accent line */}
          <div
            className="mt-6 h-px w-32"
            style={{ background: `linear-gradient(to right, ${glowColor}80, transparent)` }}
          />
        </div>

        {/* Content */}
        <div className="px-14 py-10">{children}</div>

        {/* Bottom spacer */}
        <div className="h-20" />
      </div>
    </div>
  );
};
