import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture, Html } from "@react-three/drei";
import * as THREE from "three";

import earthTex   from "@/assets/textures/real_earth_daymap.jpg";
import jupiterTex from "@/assets/textures/real_jupiter.jpg";
import saturnTex  from "@/assets/textures/real_saturn.jpg";
import marsTex    from "@/assets/textures/real_mars.jpg";
import venusTex   from "@/assets/textures/real_venus.jpg";
import mercuryTex from "@/assets/textures/real_mercury.jpg";
import neptuneTex from "@/assets/textures/real_neptune.jpg";
import uranusTex  from "@/assets/textures/uranus.jpg";
import moonTex    from "@/assets/textures/moon.jpg";

// ─── Module state passed from the OS lobby ────────────────────────────────────
export interface PlanetStateInfo {
  status: "LIVE" | "FROZEN" | "BUILDING";
  description: string;
}

function moduleStatusColor(status: PlanetStateInfo["status"] | undefined, baseGlow: string): string {
  if (status === "BUILDING") return "#f59e0b";
  return baseGlow; // FROZEN keeps its module color, dimmed via emissiveIntensity
}

const formatPair = (key: string): string => {
  if (!key) return "";
  if (key.length === 6 && !key.includes("1")) return `${key.slice(0, 3)}/${key.slice(3)}`;
  return key.toUpperCase();
};

// ─── Shaders ─────────────────────────────────────────────────────────────────
const STAR_VERT = `
  attribute vec3 aColor;
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const STAR_FRAG = `
  varying vec3 vColor;
  void main() {
    vec2  uv = gl_PointCoord - vec2(0.5);
    float r2 = dot(uv, uv);
    if (r2 > 0.25) discard;
    float a = 1.0 - smoothstep(0.05, 0.25, r2);
    gl_FragColor = vec4(vColor, a);
  }
`;

// ─── Starfield ────────────────────────────────────────────────────────────────
const Starfield = () => {
  const ref = useRef<THREE.Points>(null);
  const obj = useMemo(() => {
    const n = 20000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz  = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r     = 350 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      const rnd = Math.random();
      if      (rnd < 0.50) { col[i*3]=1.0; col[i*3+1]=0.60+Math.random()*0.15; col[i*3+2]=0.40; sz[i]=1.2+Math.random()*0.6; }
      else if (rnd < 0.70) { col[i*3]=1.0; col[i*3+1]=0.78+Math.random()*0.10; col[i*3+2]=0.50; sz[i]=1.4+Math.random()*0.8; }
      else if (rnd < 0.85) { col[i*3]=1.0; col[i*3+1]=0.96; col[i*3+2]=0.72; sz[i]=1.5+Math.random()*0.9; }
      else if (rnd < 0.92) { col[i*3]=1.0; col[i*3+1]=1.0; col[i*3+2]=0.88; sz[i]=1.6+Math.random()*1.0; }
      else if (rnd < 0.97) { col[i*3]=0.95; col[i*3+1]=0.97; col[i*3+2]=1.0; sz[i]=1.7+Math.random()*1.2; }
      else                  { col[i*3]=0.60; col[i*3+1]=0.75; col[i*3+2]=1.0; sz[i]=2.4+Math.random()*2.0; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor",   new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(sz,  1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }, []);
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.00003; });
  return <primitive ref={ref} object={obj} />;
};

// ─── Milky Way ────────────────────────────────────────────────────────────────
const MilkyWay = () => {
  const obj = useMemo(() => {
    const n = 5000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz  = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 260 + Math.random() * 200;
      const y = (Math.random() - 0.5) * 50;
      pos[i*3]=r*Math.cos(theta); pos[i*3+1]=y; pos[i*3+2]=r*Math.sin(theta);
      const t=Math.random();
      col[i*3]=0.75+t*0.2; col[i*3+1]=0.80+t*0.15; col[i*3+2]=0.95;
      sz[i] = 0.8 + Math.random() * 0.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor",   new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(sz,  1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    (pts.material as THREE.ShaderMaterial).uniforms;
    return pts;
  }, []);
  return <primitive object={obj} />;
};

// ─── Saturn rings ─────────────────────────────────────────────────────────────
const SaturnRings = ({ r }: { r: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(r * 1.3, r * 2.2, 128);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv  = g.attributes.uv  as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      uv.setXY(i, (Math.sqrt(x*x+z*z) - r*1.3) / (r*0.9), 0);
    }
    return g;
  }, [r]);
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.001; });
  return (
    <mesh ref={ref} geometry={geo} rotation={[Math.PI*0.42, 0.1, 0.3]}>
      <meshBasicMaterial color={new THREE.Color(0.88, 0.74, 0.54)} side={THREE.DoubleSide} transparent opacity={0.50} depthWrite={false} />
    </mesh>
  );
};

// ─── Atmosphere glow ──────────────────────────────────────────────────────────
const Atmo = ({ radius, color }: { radius: number; color: string }) => (
  <mesh>
    <sphereGeometry args={[radius * 1.18, 32, 32]} />
    <meshBasicMaterial color={new THREE.Color(color)} transparent opacity={0.09} side={THREE.BackSide} depthWrite={false} />
  </mesh>
);

// ─── Planet ───────────────────────────────────────────────────────────────────
interface PlanetProps {
  assetKey: string;    // "" = decorative
  texture: string;
  distance: number;
  angle: number;
  size: number;
  baseGlow: string;
  rings?: boolean;
  orbitSpeed: number;
  state?: PlanetStateInfo;
  onClick: (key: string) => void;
}

const Planet = ({ assetKey, texture, distance, angle, size, baseGlow, rings, orbitSpeed, state, onClick }: PlanetProps) => {
  const meshRef  = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const tex = useTexture(texture);

  const activeColor = moduleStatusColor(state?.status, baseGlow);
  const displayName = formatPair(assetKey);
  const hasState    = !!assetKey && !!state;
  const isInteractive = !!assetKey;

  useFrame(st => {
    if (!meshRef.current || !groupRef.current) return;
    meshRef.current.rotation.y += 0.004;
    const t   = st.clock.getElapsedTime() * orbitSpeed;
    const rad = angle * Math.PI / 180 + t;
    groupRef.current.position.x = Math.cos(rad) * distance;
    groupRef.current.position.z = Math.sin(rad) * distance;
  });

  return (
    <group ref={groupRef} position={[Math.cos(angle*Math.PI/180)*distance, 0, Math.sin(angle*Math.PI/180)*distance]}>
      <mesh
        ref={meshRef}
        onClick={isInteractive ? () => onClick(assetKey) : undefined}
        onPointerOver={() => { if (isInteractive) { setHovered(true); document.body.style.cursor = "pointer"; }}}
        onPointerOut={()  => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[size, 96, 96]} />
        <meshStandardMaterial
          map={tex} metalness={0.05} roughness={0.82}
          emissive={new THREE.Color(activeColor)}
          emissiveIntensity={hovered ? 0.55 : state?.status === "FROZEN" ? 0.12 : hasState ? 0.22 : 0.08}
        />
      </mesh>
      <Atmo radius={size} color={activeColor} />
      {rings && <SaturnRings r={size} />}

      {/* Module HUD — always visible for module planets */}
      {isInteractive && (
        <Html center position={[0, -(size + 2.0), 0]} zIndexRange={[100, 100]}>
          <div style={{
            fontFamily: "monospace",
            pointerEvents: "none",
            userSelect: "none",
            textAlign: "center",
            minWidth: "92px",
            padding: "5px 10px 6px",
            borderRadius: "8px",
            background: "rgba(0,1,6,0.85)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${activeColor}${hovered ? "55" : "28"}`,
            boxShadow: hovered ? `0 0 18px ${activeColor}22` : "none",
            opacity: hovered ? 1 : state?.status === "FROZEN" ? 0.55 : 0.85,
            transform: hovered ? "translateY(-1px)" : "none",
            transition: "all 0.18s ease",
          }}>
            <div style={{
              color: "#ffffff", fontSize: "11px", fontWeight: "900",
              letterSpacing: "0.18em", textTransform: "uppercase",
              textShadow: `0 0 8px ${activeColor}88`,
            }}>{displayName}</div>
            {hasState && state ? (
              <>
                <div style={{ color: activeColor, fontSize: "8px", fontWeight: "800", letterSpacing: "0.12em", marginTop: "2px" }}>
                  {state.status === "LIVE" ? "● LIVE" : state.status === "FROZEN" ? "◌ FROZEN" : "◑ BUILDING"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "7.5px", marginTop: "2px", maxWidth: "100px" }}>
                  {state.description}
                </div>
              </>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.22)", fontSize: "7.5px", marginTop: "2px" }}>module</div>
            )}
          </div>
        </Html>
      )}

      <pointLight color={activeColor} intensity={hovered ? 3.2 : state?.status === "FROZEN" ? 1.0 : hasState ? 1.8 : 1.0} distance={22} />
    </group>
  );
};

// ─── Central Nexus ────────────────────────────────────────────────────────────
const NexusEarth = () => {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useTexture(earthTex);
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.001; });
  return (
    <group>
      <mesh ref={ref}><sphereGeometry args={[8,128,128]} /><meshStandardMaterial map={tex} metalness={0.05} roughness={0.9} /></mesh>
      <mesh><sphereGeometry args={[8.65,48,48]} /><meshBasicMaterial color={new THREE.Color(0.25,0.55,1.0)} transparent opacity={0.055} side={THREE.BackSide} depthWrite={false} /></mesh>
      {/* WARROOM label on the nexus */}
      <Html center position={[0, 11.5, 0]} zIndexRange={[200, 200]}>
        <div style={{
          fontFamily: "monospace", textAlign: "center", pointerEvents: "none",
          color: "#ef4444", fontSize: "10px", fontWeight: "900", letterSpacing: "0.3em",
          textShadow: "0 0 12px #ef444488", padding: "3px 8px",
          background: "rgba(0,0,0,0.7)", borderRadius: "4px",
          border: "1px solid rgba(239,68,68,0.3)",
        }}>WARROOM NEXUS</div>
      </Html>
      <pointLight color="#fff5e0" intensity={2.2} distance={90} />
    </group>
  );
};

// ─── Orbit ring ───────────────────────────────────────────────────────────────
const OrbitRing = ({ radius, opacity=0.12 }: { radius:number; opacity?:number }) => {
  const pts = useMemo(() => {
    const p: THREE.Vector3[] = [];
    for (let i=0;i<=192;i++) { const a=i/192*Math.PI*2; p.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius)); }
    return new THREE.BufferGeometry().setFromPoints(p);
  }, [radius]);
  return <line geometry={pts}><lineBasicMaterial color="#8899cc" transparent opacity={opacity} /></line>;
};

// ─── Planet definitions (module-mapped) ──────────────────────────────────────
// Each `assetKey` is an OS module key — "" means decorative (no click).
// COSMOS = module navigation layer. COMMAND = asset execution layer.
const PLANET_DEFS = [
  // Inner orbit — active OS modules
  { assetKey: "command",    texture: jupiterTex, distance: 18, angle: 270, size: 3.2, baseGlow: "#ef4444", orbitSpeed: 0.00045 },
  { assetKey: "markets",    texture: saturnTex,  distance: 18, angle: 90,  size: 3.0, baseGlow: "#3b82f6", rings: true, orbitSpeed: 0.00038 },
  { assetKey: "intel",      texture: neptuneTex, distance: 18, angle: 180, size: 2.8, baseGlow: "#f59e0b", orbitSpeed: 0.00052 },
  { assetKey: "polymarket", texture: uranusTex,  distance: 18, angle: 0,   size: 3.1, baseGlow: "#a855f7", orbitSpeed: 0.00035 },
  // Outer orbit — utility modules
  { assetKey: "journal",    texture: earthTex,   distance: 30, angle: 0,   size: 2.5, baseGlow: "#10b981", orbitSpeed: 0.00028 },
  { assetKey: "risk",       texture: marsTex,    distance: 30, angle: 72,  size: 2.6, baseGlow: "#ff6644", orbitSpeed: 0.00022 },
  { assetKey: "settings",   texture: mercuryTex, distance: 30, angle: 144, size: 2.3, baseGlow: "#6b7280", orbitSpeed: 0.00031 },
  // Decorative
  { assetKey: "",           texture: venusTex,   distance: 30, angle: 216, size: 2.0, baseGlow: "#f97316", orbitSpeed: 0.00025 },
] as const;

// ─── Main export ──────────────────────────────────────────────────────────────
interface ThreeSceneProps {
  onPlanetClick: (moduleKey: string) => void;
  moduleStates?: Record<string, PlanetStateInfo>;
}

export const ThreeScene = ({ onPlanetClick, moduleStates = {} }: ThreeSceneProps) => (
  <div className="fixed inset-0 z-[1]">
    <Canvas camera={{ position:[0,22,68], fov:65 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[60,40,60]} intensity={2.2} color="#fff8e8" />
      <directionalLight position={[-40,-30,-40]} intensity={0.35} color="#8899ff" />
      <pointLight position={[0,0,0]} intensity={4.5} distance={320} color="#fff5e0" />
      <fog attach="fog" args={["#000511", 60, 560]} />
      <Starfield />
      <MilkyWay />
      <NexusEarth />
      <OrbitRing radius={18} opacity={0.16} />
      <OrbitRing radius={30} opacity={0.09} />
      {PLANET_DEFS.map((p, i) => (
        <Planet
          key={i}
          assetKey={p.assetKey}
          texture={p.texture}
          distance={p.distance}
          angle={p.angle}
          size={p.size}
          baseGlow={p.baseGlow}
          rings={"rings" in p ? p.rings : undefined}
          orbitSpeed={p.orbitSpeed}
          state={p.assetKey ? moduleStates[p.assetKey] : undefined}
          onClick={onPlanetClick}
        />
      ))}
      <OrbitControls
        enableDamping dampingFactor={0.05} enableZoom enablePan={false}
        minDistance={40} maxDistance={145} autoRotate autoRotateSpeed={0.10}
      />
    </Canvas>
  </div>
);
