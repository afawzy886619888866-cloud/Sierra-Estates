'use client';

/**
 * Hero3DScene — the react-three-fiber scene behind the homepage hero.
 *
 * A slowly drifting skyline of extruded blocks with the brand shield floating
 * above it. Deliberately geometry-only (no textures, no GLTF fetch) so it costs
 * nothing to load and can never block the hero copy from painting.
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import type { Group, Mesh } from 'three';

const GOLD = '#C8961A';
const GOLD_LIGHT = '#E9C176';
const NAVY = '#0B1A2E';

interface Block {
  key: number;
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  gold: boolean;
}

/** Deterministic pseudo-random so server and client agree on the layout. */
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function useBlocks(count: number): Block[] {
  return useMemo(() => {
    const rand = seededRandom(20260817);
    const blocks: Block[] = [];
    for (let i = 0; i < count; i += 1) {
      const ring = 2.2 + rand() * 5.2;
      const angle = rand() * Math.PI * 2;
      blocks.push({
        key: i,
        x: Math.cos(angle) * ring,
        z: Math.sin(angle) * ring,
        height: 0.7 + rand() * 3.4,
        width: 0.34 + rand() * 0.45,
        depth: 0.34 + rand() * 0.45,
        gold: rand() > 0.78,
      });
    }
    return blocks;
  }, [count]);
}

function Skyline() {
  const group = useRef<Group>(null);
  const blocks = useBlocks(46);

  useFrame((_state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.055;
  });

  return (
    <group ref={group}>
      {blocks.map((block) => (
        <mesh
          key={block.key}
          position={[block.x, block.height / 2 - 1.4, block.z]}
          castShadow={false}
        >
          <boxGeometry args={[block.width, block.height, block.depth]} />
          <meshStandardMaterial
            color={block.gold ? GOLD : NAVY}
            emissive={block.gold ? GOLD : '#12283f'}
            emissiveIntensity={block.gold ? 0.5 : 0.22}
            metalness={0.75}
            roughness={block.gold ? 0.24 : 0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function Shield() {
  const mesh = useRef<Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.55;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.18} floatIntensity={0.75}>
      <mesh ref={mesh} position={[0, 1.15, 0]}>
        <octahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial
          color={GOLD_LIGHT}
          emissive={GOLD}
          emissiveIntensity={0.42}
          metalness={0.95}
          roughness={0.16}
          flatShading
        />
      </mesh>
    </Float>
  );
}

function GroundGlow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]}>
      <circleGeometry args={[9, 48]} />
      <meshBasicMaterial color={NAVY} transparent opacity={0.55} />
    </mesh>
  );
}

export default function Hero3DScene() {
  return (
    <Canvas
      className="hero3d"
      camera={{ position: [0, 2.4, 9.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <PerformanceMonitor />
      <AdaptiveDpr pixelated />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 9, 4]} intensity={1.35} color={GOLD_LIGHT} />
      <pointLight position={[-7, 3, -5]} intensity={38} color="#E63946" distance={22} />
      <pointLight position={[5, 2, 6]} intensity={26} color={GOLD} distance={20} />
      <GroundGlow />
      <Skyline />
      <Shield />
      <fog attach="fog" args={[NAVY, 11, 22]} />
    </Canvas>
  );
}
