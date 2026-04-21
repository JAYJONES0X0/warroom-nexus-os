import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture, Html } from "@react-three/drei";
import * as THREE from "three";

import earthTex   from "@/assets/textures/nexus-earth-realistic.jpg";
import jupiterTex from "@/assets/textures/jupiter.jpg";
import saturnTex  from "@/assets/textures/saturn.jpg";
import marsTex    from "@/assets/textures/mars.jpg";
import venusTex   from "@/assets/textures/venus.jpg";
import mercuryTex from "@/assets/textures/mercury.jpg";
import neptuneTex from "@/assets/textures/neptune.jpg";
import uranusTex  from "@/assets/textures/uranus.jpg";
import moonTex    from "@/assets/textures/moon.jpg";

// ─── Round-star shaders ───────────────────────────────────────────────────────
// Uses gl_PointCoord to discard outside a circle — works on every GPU.
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

// ─── Realistic Starfield ─────────────────────────────────────────────────────
const Starfield = () => {
  const ref = useRef<THREE.Points>(null);

  const obj = useMemo(() => {
    const n   = 20000;
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
      // M-class (red-orange dwarfs) — 50%
      if      (rnd < 0.50) { col[i*3]=1.0; col[i*3+1]=0.60+Math.random()*0.15; col[i*3+2]=0.40; sz[i]=1.2+Math.random()*0.6; }
      // K-class (orange) — 20%
      else if (rnd < 0.70) { col[i*3]=1.0; col[i*3+1]=0.78+Math.random()*0.10; col[i*3+2]=0.50; sz[i]=1.4+Math.random()*0.8; }
      // G-class (yellow, sun-like) — 15%
      else if (rnd < 0.85) { col[i*3]=1.0; col[i*3+1]=0.96; col[i*3+2]=0.72; sz[i]=1.5+Math.random()*0.9; }
      // F-class (yellow-white) — 7%
      else if (rnd < 0.92) { col[i*3]=1.0; col[i*3+1]=1.0; col[i*3+2]=0.88; sz[i]=1.6+Math.random()*1.0; }
      // A-class (white) — 5%
      else if (rnd < 0.97) { col[i*3]=0.95; col[i*3+1]=0.97; col[i*3+2]=1.0; sz[i]=1.7+Math.random()*1.2; }
      // O/B-class (hot blue giants) — 3%, rarest + brightest
      else                  { col[i*3]=0.60; col[i*3+1]=0.75; col[i*3+2]=1.0; sz[i]=2.4+Math.random()*2.0; }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor",   new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(sz,  1));

    const mat = new THREE.ShaderMaterial({
      vertexShader:   STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    });

    return new THREE.Points(geo, mat);
  }, []);

  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.00003; });

  return <primitive ref={ref} object={obj} />;
};

// ─── Milky Way band (also round sprites via shader) ──────────────────────────
const MilkyWay = () => {
  const obj = useMemo(() => {
    const n   = 5000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz  = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r     = 260 + Math.random() * 200;
      const y     = (Math.random() - 0.5) * 50;
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
    (pts.material as THREE.ShaderMaterial).uniforms; // touch to keep ref
    return pts;
  }, []);

  return <primitive object={obj} />;
};

// ─── Saturn rings ────────────────────────────────────────────────────────────
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

// ─── Atmosphere glow ─────────────────────────────────────────────────────────
const Atmo = ({ radius, color }: { radius: number; color: string }) => (
  <mesh>
    <sphereGeometry args={[radius * 1.15, 32, 32]} />
    <meshBasicMaterial color={new THREE.Color(color)} transparent opacity={0.07} side={THREE.BackSide} depthWrite={false} />
  </mesh>
);

// ─── Planet ──────────────────────────────────────────────────────────────────
interface PlanetProps {
  name: string; texture: string; distance: number; angle: number;
  size: number; glowColor: string; rings?: boolean; orbitSpeed: number;
  onClick: () => void;
}

const Planet = ({ name, texture, distance, angle, size, glowColor, rings, orbitSpeed, onClick }: PlanetProps) => {
  const meshRef  = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const tex = useTexture(texture);

  useFrame(state => {
    if (!meshRef.current || !groupRef.current) return;
    meshRef.current.rotation.y += 0.004;
    const t   = state.clock.getElapsedTime() * orbitSpeed;
    const rad = angle * Math.PI / 180 + t;
    groupRef.current.position.x = Math.cos(rad) * distance;
    groupRef.current.position.z = Math.sin(rad) * distance;
  });

  return (
    <group ref={groupRef} position={[Math.cos(angle*Math.PI/180)*distance, 0, Math.sin(angle*Math.PI/180)*distance]}>
      <mesh ref={meshRef} onClick={onClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={()  => { setHovered(false); document.body.style.cursor = "default"; }}>
        <sphereGeometry args={[size, 96, 96]} />
        <meshStandardMaterial map={tex} metalness={0.05} roughness={0.82}
          emissive={new THREE.Color(glowColor)} emissiveIntensity={hovered ? 0.32 : 0.05} />
      </mesh>
      <Atmo radius={size} color={glowColor} />
      {rings && <SaturnRings r={size} />}
      <Html center position={[0, -(size+1.8), 0]} zIndexRange={[100,100]}>
        <div style={{
          color:"#fff", fontSize:"11px", fontFamily:"monospace", fontWeight:"900",
          letterSpacing:"0.2em", textTransform:"uppercase", whiteSpace:"nowrap",
          pointerEvents:"none", userSelect:"none", padding:"2px 7px", borderRadius:"4px",
          background:`${glowColor}28`, border:`1px solid ${glowColor}55`,
          textShadow:`0 0 10px ${glowColor}, 0 1px 3px #000`,
          opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(5px)",
          transition: "opacity 0.15s, transform 0.15s",
        }}>{name}</div>
      </Html>
      <pointLight color={glowColor} intensity={hovered ? 2.8 : 1.0} distance={18} />
    </group>
  );
};

// ─── Central Nexus Earth ─────────────────────────────────────────────────────
const NexusEarth = () => {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useTexture(earthTex);
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.001; });
  return (
    <group>
      <mesh ref={ref}><sphereGeometry args={[8,128,128]} /><meshStandardMaterial map={tex} metalness={0.05} roughness={0.9} /></mesh>
      <mesh><sphereGeometry args={[8.65,48,48]} /><meshBasicMaterial color={new THREE.Color(0.25,0.55,1.0)} transparent opacity={0.055} side={THREE.BackSide} depthWrite={false} /></mesh>
      <pointLight color="#fff5e0" intensity={2.2} distance={90} />
    </group>
  );
};

// ─── Orbit ring ──────────────────────────────────────────────────────────────
const OrbitRing = ({ radius, opacity=0.12 }: { radius:number; opacity?:number }) => {
  const pts = useMemo(() => {
    const p: THREE.Vector3[] = [];
    for (let i=0;i<=192;i++) { const a=i/192*Math.PI*2; p.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius)); }
    return new THREE.BufferGeometry().setFromPoints(p);
  }, [radius]);
  return <line geometry={pts}><lineBasicMaterial color="#8899cc" transparent opacity={opacity} /></line>;
};

// ─── Main scene ───────────────────────────────────────────────────────────────
interface ThreeSceneProps { onPlanetClick: (name:string)=>void; }

export const ThreeScene = ({ onPlanetClick }: ThreeSceneProps) => {
  const planets = [
    { name:"Markets",      texture:jupiterTex, distance:18, angle:0,   size:3.2, glowColor:"#ff4444", orbitSpeed:0.00045 },
    { name:"Intelligence", texture:neptuneTex, distance:18, angle:90,  size:3.0, glowColor:"#aa44ff", orbitSpeed:0.00038 },
    { name:"Execution",    texture:marsTex,    distance:18, angle:180, size:2.8, glowColor:"#ffdd00", orbitSpeed:0.00052 },
    { name:"Analytics",    texture:saturnTex,  distance:18, angle:270, size:3.1, glowColor:"#0099ff", rings:true, orbitSpeed:0.00035 },
    { name:"Alerts",       texture:venusTex,   distance:30, angle:0,   size:2.5, glowColor:"#ff8800", orbitSpeed:0.00028 },
    { name:"Journal",      texture:earthTex,   distance:30, angle:60,  size:2.6, glowColor:"#c0c0c0", orbitSpeed:0.00022 },
    { name:"Reports",      texture:mercuryTex, distance:30, angle:120, size:2.3, glowColor:"#44ffaa", orbitSpeed:0.00031 },
    { name:"Trades",       texture:uranusTex,  distance:30, angle:180, size:2.7, glowColor:"#00ddff", orbitSpeed:0.00019 },
    { name:"History",      texture:moonTex,    distance:30, angle:240, size:2.2, glowColor:"#ff9944", orbitSpeed:0.00025 },
    { name:"Settings",     texture:mercuryTex, distance:30, angle:300, size:2.2, glowColor:"#00ff88", orbitSpeed:0.00017 },
  ];

  return (
    <div className="fixed inset-0 z-[1]">
      <Canvas camera={{ position:[0,22,68], fov:65 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[60,40,60]} intensity={2.2} color="#fff8e8" />
        <directionalLight position={[-40,-30,-40]} intensity={0.35} color="#8899ff" />
        <pointLight position={[0,0,0]} intensity={4.5} distance={320} color="#fff5e0" />
        <fog attach="fog" args={["#000511",60,560]} />
        <Starfield />
        <MilkyWay />
        <NexusEarth />
        <OrbitRing radius={18} opacity={0.16} />
        <OrbitRing radius={30} opacity={0.09} />
        {planets.map(p => <Planet key={p.name} {...p} onClick={() => onPlanetClick(p.name)} />)}
        <OrbitControls enableDamping dampingFactor={0.05} enableZoom enablePan={false}
          minDistance={40} maxDistance={145} autoRotate autoRotateSpeed={0.10} />
      </Canvas>
    </div>
  );
};
