import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";

const RotatingSphere = ({ texture }: { texture: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useTexture(texture);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.008;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={tex} metalness={0.05} roughness={0.85} />
    </mesh>
  );
};

interface PlanetOrbProps {
  texture: string;
  glowColor?: string;
  label?: string;
}

export const PlanetOrb = ({ texture, glowColor = "#10b981", label = "HOME" }: PlanetOrbProps) => {
  const navigate = useNavigate();
  return (
    <div
      className="fixed top-6 right-6 z-[300] flex flex-col items-center cursor-pointer group"
      onClick={() => navigate("/")}
      title="Return to NEXUS Home"
    >
      <div
        className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500/30 group-hover:border-emerald-400/70 transition-all group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
        style={{ boxShadow: `0 0 20px ${glowColor}22` }}
      >
        <Canvas camera={{ position: [0, 0, 2.8], fov: 45 }} style={{ background: "transparent" }}>
          <ambientLight intensity={1.2} />
          <pointLight position={[3, 3, 3]} intensity={2} color="#ffffff" />
          <RotatingSphere texture={texture} />
        </Canvas>
      </div>
      <div className="text-[9px] text-emerald-400/60 group-hover:text-emerald-300 font-mono tracking-[0.2em] mt-1.5 uppercase transition-colors">
        ← {label}
      </div>
    </div>
  );
};
