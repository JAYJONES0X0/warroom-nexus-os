import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture, Html } from "@react-three/drei";
import * as THREE from "three";

// Import photorealistic planet textures
import nexusEarthTexture from "@/assets/textures/nexus-earth-realistic.jpg";
import marketsTexture from "@/assets/textures/markets-realistic.jpg";
import tradesTexture from "@/assets/textures/trades-realistic.jpg";
import intelligenceTexture from "@/assets/textures/intelligence-realistic.jpg";
import alertsTexture from "@/assets/textures/alerts-realistic.jpg";
import settingsTexture from "@/assets/textures/settings-realistic.jpg";
import journalTexture from "@/assets/textures/journal-realistic.jpg";
import executionTexture from "@/assets/textures/execution-realistic.jpg";
import analyticsTexture from "@/assets/textures/analytics-realistic.jpg";
import historyTexture from "@/assets/textures/history-realistic.jpg";
interface PlanetProps {
  name: string;
  icon: string;
  distance: number;
  angle: number;
  color: string;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}
interface PlanetPropsExtended extends PlanetProps {
  texture: string;
  size: number;
  glowColor: string;
}
const Planet = ({
  name,
  distance,
  angle,
  texture,
  onClick,
  onHover,
  size,
  glowColor
}: PlanetPropsExtended) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const planetTexture = useTexture(texture);

  useFrame(state => {
    if (meshRef.current && groupRef.current) {
      meshRef.current.rotation.y += 0.003;
      const t = state.clock.getElapsedTime() * 0.0005;
      const currentAngle = angle + t * 30;
      const angleRad = currentAngle * Math.PI / 180;
      const x = Math.cos(angleRad) * distance;
      const z = Math.sin(angleRad) * distance;
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
    }
  });

  const initX = Math.cos(angle * Math.PI / 180) * distance;
  const initZ = Math.sin(angle * Math.PI / 180) * distance;

  return <group ref={groupRef} position={[initX, 0, initZ]}>
      <mesh ref={meshRef} onClick={onClick}
        onPointerOver={() => { setHovered(true); onHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); onHover(false); document.body.style.cursor = "default"; }}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshStandardMaterial map={planetTexture} metalness={0.05} roughness={0.9}
          emissive={hovered ? new THREE.Color(glowColor) : new THREE.Color(0x000000)}
          emissiveIntensity={hovered ? 0.3 : 0} />
      </mesh>

      {/* Planet name label */}
      <Html center position={[0, -(size + 1.2), 0]} distanceFactor={18} zIndexRange={[0, 0]}>
        <div style={{
          color: hovered ? '#ffffff' : 'rgba(255,255,255,0.65)',
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: `0 0 8px ${glowColor}, 0 1px 3px rgba(0,0,0,0.8)`,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'all 0.2s',
        }}>
          {name}
        </div>
      </Html>

      <pointLight color={glowColor} intensity={hovered ? 1.5 : 0.4} distance={14} />
    </group>;
};
const Starfield = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions, colors] = useMemo(() => {
    const starCount = 15000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      // Place stars in a spherical shell far from center
      const radius = 300 + Math.random() * 400; // Between 300 and 700 units away
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
      colors[i] = 1;
      colors[i + 1] = 1;
      colors[i + 2] = 1;
    }
    return [positions, colors];
  }, []);
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.00005;
    }
  });
  return <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={1.5} vertexColors transparent opacity={0.8} sizeAttenuation />
    </points>;
};
const NexusEarth = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(nexusEarthTexture);
  useFrame(state => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
    // Pulse the glow
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1 + 0.9;
      glowRef.current.scale.setScalar(1.2 * pulse);
    }
  });
  return <group>
      {/* Photorealistic Nexus Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[8, 128, 128]} />
        <meshStandardMaterial map={texture} metalness={0.05} roughness={0.9} />
      </mesh>

      {/* Central ambient light */}
      <pointLight color="#ffffff" intensity={2} distance={80} />
    </group>;
};

// Nebula background with fog particles
const NebulaBackground = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions, colors] = useMemo(() => {
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      // Scattered nebula particles
      const radius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      // Mix of purple, blue, and gold nebula colors
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        // Purple/magenta
        colors[i] = 0.5 + Math.random() * 0.3;
        colors[i + 1] = 0.2;
        colors[i + 2] = 0.8;
      } else if (colorChoice < 0.7) {
        // Cyan/blue
        colors[i] = 0.2;
        colors[i + 1] = 0.5 + Math.random() * 0.5;
        colors[i + 2] = 1;
      } else {
        // Gold/orange
        colors[i] = 1;
        colors[i + 1] = 0.6 + Math.random() * 0.3;
        colors[i + 2] = 0.2;
      }
    }
    return [positions, colors];
  }, []);
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0001;
      pointsRef.current.rotation.x += 0.00005;
    }
  });
  return <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={2.5} vertexColors transparent opacity={0.6} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>;
};
const OrbitRing = ({ radius, opacity = 0.15 }: { radius: number; opacity?: number }) => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#d4a574" transparent opacity={opacity} />
    </line>
  );
};

interface ThreeSceneProps {
  onPlanetClick: (name: string) => void;
}
export const ThreeScene = ({
  onPlanetClick
}: ThreeSceneProps) => {
  // Inner ring — core trading planets (distance 18)
  // Outer ring — support planets (distance 30)
  const planetsData = [
    { name: "Markets",     texture: marketsTexture,     icon: "📊", distance: 18, angle: 0,   size: 2.6, glowColor: "#ff4444" },
    { name: "Intelligence",texture: intelligenceTexture, icon: "🧠", distance: 18, angle: 90,  size: 2.8, glowColor: "#aa44ff" },
    { name: "Execution",   texture: executionTexture,   icon: "⚡", distance: 18, angle: 180, size: 2.4, glowColor: "#ffdd00" },
    { name: "Analytics",   texture: analyticsTexture,   icon: "📈", distance: 18, angle: 270, size: 2.5, glowColor: "#0099ff" },
    { name: "Alerts",      texture: alertsTexture,      icon: "🔔", distance: 30, angle: 0,   size: 2.2, glowColor: "#ff8800" },
    { name: "Journal",     texture: journalTexture,     icon: "📝", distance: 30, angle: 60,  size: 2.3, glowColor: "#aaaaaa" },
    { name: "Reports",     texture: historyTexture,     icon: "📋", distance: 30, angle: 120, size: 2.0, glowColor: "#44ffaa" },
    { name: "Trades",      texture: tradesTexture,      icon: "💹", distance: 30, angle: 180, size: 2.5, glowColor: "#00ddff" },
    { name: "History",     texture: historyTexture,     icon: "🕐", distance: 30, angle: 240, size: 2.1, glowColor: "#ff9944" },
    { name: "Settings",    texture: settingsTexture,    icon: "⚙️", distance: 30, angle: 300, size: 1.9, glowColor: "#00ff88" },
  ];
  return <div className="fixed inset-0 z-[1]">
      <Canvas camera={{
      position: [0, 15, 55],
      fov: 75
    }} className="text-secondary-foreground">
        {/* Ambient and key lighting - bright for HD texture visibility */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[50, 50, 50]} intensity={2} color="#ffffff" />
        <directionalLight position={[-50, -50, -50]} intensity={1} color="#ffffff" />
        <pointLight position={[0, 0, 0]} intensity={5} distance={300} color="#ffffff" />
        <pointLight position={[50, 40, 50]} intensity={2} distance={250} color="#ffffff" />
        <pointLight position={[-50, -40, -50]} intensity={2} distance={250} color="#ffffff" />
        <pointLight position={[0, 60, 0]} intensity={1.5} distance={200} color="#ffffff" />
        
        {/* Fog for atmospheric depth */}
        <fog attach="fog" args={['#000511', 50, 500]} />

        {/* Starfield and nebula background */}
        <Starfield />
        <NebulaBackground />

        {/* Central Nexus Earth */}
        <NexusEarth />

        {/* Orbit rings */}
        <OrbitRing radius={18} opacity={0.18} />
        <OrbitRing radius={30} opacity={0.10} />

        {/* Orbiting planets */}
        {planetsData.map(planet => <Planet key={planet.name} name={planet.name} icon={planet.icon} distance={planet.distance} angle={planet.angle} texture={planet.texture} size={planet.size} glowColor={planet.glowColor} color="#ffffff" onClick={() => onPlanetClick(planet.name)} onHover={() => {}} />)}

        <OrbitControls enableDamping dampingFactor={0.05} enableZoom enablePan={false} minDistance={30} maxDistance={120} autoRotate autoRotateSpeed={0.15} />
      </Canvas>
    </div>;
};