'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Html } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import type { MapCompound } from './CompoundsMap';

const GOLD = '#E9C176';
const BLUE_ACCENT = '#00AEFF';
const DARK_NAVY = '#071523';
const CARD_BG = 'rgba(7, 21, 35, 0.92)';

function CompoundBuilding({
  compound,
  isSelected,
  onSelect,
  position,
}: {
  compound: MapCompound;
  isSelected: boolean;
  onSelect: (name: string) => void;
  position: [number, number, number];
}) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Height proportional to AI score / price
  const height = useMemo(() => 0.8 + (compound.ai - 8) * 0.8, [compound.ai]);
  const isHot = compound.ai >= 9.2;
  const color = isSelected ? '#ffffff' : isHot ? GOLD : BLUE_ACCENT;

  useFrame((_state, delta) => {
    if (meshRef.current && (hovered || isSelected)) {
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(compound.n);
        }}
        onPointerOver={() => {
          setHovered(true);
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.7, height, 0.7]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.6 : 0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Floating badge tooltip */}
      {(hovered || isSelected) && (
        <Html position={[0, height + 0.5, 0]} center distanceFactor={12}>
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${GOLD}`,
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
              fontFamily: 'var(--font-ui, sans-serif)',
              fontSize: '12px',
            }}
          >
            <strong style={{ color: GOLD, display: 'block', fontSize: '13px' }}>{compound.n}</strong>
            <div>{compound.z} · EGP {compound.priceM}M</div>
            <div style={{ color: '#49d6a2', fontSize: '11px', marginTop: '2px' }}>
              AI Score: {compound.ai.toFixed(1)}/10 · {compound.g}
            </div>
          </div>
        </Html>
      )}

      {/* Compound Label */}
      <Text
        position={[0, -0.2, 0.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#a0aec0"
        anchorX="center"
        anchorY="middle"
      >
        {compound.n}
      </Text>
    </group>
  );
}

function GroundGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[30, 30, 20, 20]} />
      <meshStandardMaterial color={DARK_NAVY} roughness={0.9} metalness={0.1} wireframe={false} />
    </mesh>
  );
}

export default function Compound3DViewer({
  compounds,
  selectedName,
  onSelect,
}: {
  compounds: MapCompound[];
  selectedName?: string;
  onSelect?: (name: string) => void;
}) {
  const groupRef = useRef<Group>(null);

  // Position compounds in a spatial circular grid layout
  const layout = useMemo(() => {
    return compounds.map((c, i) => {
      const radius = 3.2 + (i % 3) * 2.2;
      const angle = (i / compounds.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return { compound: c, position: [x, 0, z] as [number, number, number] };
    });
  }, [compounds]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '440px', background: DARK_NAVY, borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, color: '#fff', fontSize: '12px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)' }}>
        🎮 3D Spatial Masterplan · Drag to rotate · Scroll to zoom · Click compound to inspect
      </div>

      <Canvas camera={{ position: [0, 9, 12], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} color={GOLD} />
        <pointLight position={[-10, 8, -10]} intensity={25} color={BLUE_ACCENT} />
        
        <GroundGrid />

        <group ref={groupRef}>
          {layout.map(({ compound, position }) => (
            <CompoundBuilding
              key={compound.n}
              compound={compound}
              isSelected={selectedName === compound.n}
              onSelect={(name) => onSelect?.(name)}
              position={position}
            />
          ))}
        </group>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={4}
          maxDistance={22}
        />
      </Canvas>
    </div>
  );
}
