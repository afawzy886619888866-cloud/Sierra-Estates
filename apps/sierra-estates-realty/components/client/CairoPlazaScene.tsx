'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function PlazaMassing() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.035; });
  return (
    <group ref={group}>
      {[[-2.2, 0, 0], [0, 0.3, -0.25], [2.2, -0.1, 0.15]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[1.45, 3.6 + i * 0.35, 1.2]} />
          <meshStandardMaterial color={i === 1 ? '#c9a86a' : '#8d7657'} metalness={0.18} roughness={0.58} />
        </mesh>
      ))}
      <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#17202a" roughness={0.85} />
      </mesh>
      {[...Array(18)].map((_, i) => <mesh key={i} position={[-2.8 + (i % 9) * 0.7, 0.4 + Math.floor(i / 9) * 0.55, 0.63]}><boxGeometry args={[0.22, 0.2, 0.03]} /><meshStandardMaterial color="#7bc9dc" emissive="#1e5365" emissiveIntensity={0.35} /></mesh>)}
    </group>
  );
}

export default function CairoPlazaScene() {
  return (
    <div className="cp-scene" aria-label="Cairo Plaza architectural visualization">
      <Canvas camera={{ position: [6, 3.6, 7], fov: 42 }} shadows dpr={[1, 1.5]} fallback={<div className="h-full flex items-center justify-center text-slate-400">Cairo Plaza visualization</div>}>
        <color attach="background" args={['#0b1118']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 8, 5]} intensity={2.6} castShadow />
        <Float speed={0.6} rotationIntensity={0.08} floatIntensity={0.12}><PlazaMassing /></Float>
        <Environment preset="city" />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={12} autoRotate autoRotateSpeed={0.35} />
      </Canvas>
    </div>
  );
}
