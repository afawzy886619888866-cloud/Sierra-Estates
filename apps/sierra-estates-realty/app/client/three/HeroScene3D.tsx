'use client';
/**
 * Sierra Estates — home hero 3D backdrop (react-three-fiber).
 *
 * A slowly rotating skyline of extruded blocks laid out on a ring, standing in
 * for the New Cairo compounds. Purely decorative: it sits behind the hero copy
 * with `pointerEvents:none`, so it never intercepts clicks on the hero CTAs.
 *
 * Respects `prefers-reduced-motion` — the rotation stops and the scene renders
 * as a static composition.
 */
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

const COUNT = 34;
const RING_INNER = 5.5;
const RING_OUTER = 15;

type Block = {
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  color: string;
};

/**
 * Deterministic pseudo-random so server and client agree and the skyline does
 * not reshuffle on every re-render.
 */
function seeded(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const PALETTE = ['#0d2136', '#16324f', '#1d4468', '#c8961a', '#e9c176'];

function useSkyline(): Block[] {
  return useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + seeded(i, 1) * 0.35;
        const radius = RING_INNER + seeded(i, 2) * (RING_OUTER - RING_INNER);
        // Gold accents are rare — roughly one in six blocks.
        const gold = seeded(i, 5) > 0.83;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          height: 1.5 + seeded(i, 3) * 6.5,
          width: 0.8 + seeded(i, 4) * 0.9,
          depth: 0.8 + seeded(i, 6) * 0.9,
          color: gold
            ? PALETTE[3 + Math.round(seeded(i, 7))]
            : PALETTE[Math.floor(seeded(i, 8) * 3)],
        };
      }),
    []
  );
}

function Skyline({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const blocks = useSkyline();

  useFrame((_, delta) => {
    if (reducedMotion || !group.current) return;
    group.current.rotation.y += delta * 0.045;
  });

  return (
    <group ref={group}>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.height / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshStandardMaterial
            color={b.color}
            metalness={0.55}
            roughness={0.28}
            emissive={b.color}
            emissiveIntensity={0.14}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroScene3D() {
  // Read once at mount; the hero does not need to react to live changes.
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return (
    <div className="hero-3d" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 11, 21], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[12, 22, 9]} intensity={1.25} castShadow />
        <Environment preset="night" />
        <Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={0.12} floatIntensity={0.35}>
          <Skyline reducedMotion={reducedMotion} />
        </Float>
      </Canvas>
    </div>
  );
}
