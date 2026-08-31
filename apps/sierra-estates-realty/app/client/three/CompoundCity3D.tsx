'use client';
/**
 * Sierra Estates — 3D compound explorer (react-three-fiber).
 *
 * Every compound in the local dataset (portalData.COMPOUNDS) becomes an
 * extruded tower on a New Cairo ground plane. Geographic [lat, lng] is
 * projected to scene X/Z so the layout matches the Leaflet map; tower height
 * and colour encode price per the active pricing mode (sale EGP-millions or
 * monthly rent USD).
 *
 * Interaction: hover lifts the price billboard, click selects. Selection is
 * owned by the parent portal so the unit list and the 3D scene stay in sync.
 */
import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { Compound } from '../portalData';
import { NEW_CAIRO_CENTER } from '../portalData';

export type PriceMode = 'sale' | 'rent';

/** Scene half-width in world units; the compound spread is fitted into this box. */
const SPREAD = 26;
/** Degrees of latitude/longitude that map onto the full spread. */
const LAT_SPAN = 0.12;
const LNG_SPAN = 0.22;

const MIN_H = 1.2;
const MAX_H = 11;

/** Gold → blue ramp matching the portal's brand tokens. */
const COLD = new THREE.Color('#16324f');
const WARM = new THREE.Color('#c8961a');
const HOT = new THREE.Color('#e9c176');

export function priceOf(c: Compound, mode: PriceMode): number {
  return mode === 'sale' ? c.priceM : c.rent;
}

export function priceText(c: Compound, mode: PriceMode): string {
  return mode === 'sale'
    ? `EGP ${c.priceM}M`
    : `$${c.rent.toLocaleString('en-US')}/mo`;
}

/**
 * Projects [lat, lng] into scene space. Longitude runs along +X (east) and
 * latitude along -Z, so north sits at the back of the scene like a paper map.
 */
function project(coords: [number, number]): [number, number] {
  const [lat, lng] = coords;
  const x = ((lng - NEW_CAIRO_CENTER[1]) / LNG_SPAN) * SPREAD;
  const z = -((lat - NEW_CAIRO_CENTER[0]) / LAT_SPAN) * SPREAD;
  return [x, z];
}

function Tower({
  compound,
  mode,
  range,
  selected,
  onSelect,
}: {
  compound: Compound;
  mode: PriceMode;
  range: [number, number];
  selected: boolean;
  onSelect: (c: Compound) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const [x, z] = useMemo(() => project([compound.lat, compound.lng]), [compound.lat, compound.lng]);

  // Normalised price 0..1 within the current dataset range, driving height + colour.
  const norm = useMemo(() => {
    const [lo, hi] = range;
    if (hi <= lo) return 0.5;
    return Math.min(1, Math.max(0, (priceOf(compound, mode) - lo) / (hi - lo)));
  }, [compound, mode, range]);

  const height = MIN_H + norm * (MAX_H - MIN_H);

  const color = useMemo(() => {
    const c = COLD.clone();
    // Two-stop ramp so mid-market compounds stay readable against the dark plane.
    return norm < 0.5
      ? c.lerp(WARM, norm * 2)
      : WARM.clone().lerp(HOT, (norm - 0.5) * 2);
  }, [norm]);

  // Selected/hovered towers ease toward a taller, brighter state each frame.
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const target = selected ? 1.18 : hovered ? 1.08 : 1;
    const s = mesh.current.scale;
    s.y += (target - s.y) * Math.min(1, delta * 8);
  });

  const active = selected || hovered;

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={mesh}
        castShadow
        receiveShadow
        position={[0, height / 2, 0]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = '';
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(compound);
        }}
      >
        <boxGeometry args={[1.5, height, 1.5]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.55 : 0.12}
          metalness={0.35}
          roughness={0.32}
        />
      </mesh>

      {/* Price billboard — always rendered so the map "shows the price" at a glance. */}
      <Html
        position={[0, height + (active ? 1.5 : 1.05), 0]}
        center
        distanceFactor={30}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'none', transition: 'transform .18s ease' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: active ? '7px 13px' : '5px 10px',
            borderRadius: 20,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: active ? 13 : 11,
            fontWeight: 800,
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            color: selected ? '#0d0d0f' : '#fff',
            background: selected
              ? 'linear-gradient(135deg,#e9c176,#c8961a)'
              : 'linear-gradient(135deg,#0d2136,#162e48)',
            border: '2px solid #fff',
            boxShadow: '0 4px 14px rgba(0,0,0,.45)',
          }}
        >
          <span>{priceText(compound, mode)}</span>
          {active && (
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>
              {compound.n}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/** Subtle grid plane standing in for the New Cairo ground. */
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[SPREAD * 3, SPREAD * 3]} />
        <meshStandardMaterial color="#0a1420" roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[SPREAD * 3, 36, '#1d3a57', '#16283d']} />
    </>
  );
}

export default function CompoundCity3D({
  compounds,
  mode,
  selected,
  onSelect,
  height = 560,
}: {
  compounds: Compound[];
  mode: PriceMode;
  selected: Compound | null;
  onSelect: (c: Compound) => void;
  height?: number;
}) {
  // Range is computed over the *filtered* set so the height ramp always uses
  // the full visual scale, even when the price filter narrows the results.
  const range = useMemo<[number, number]>(() => {
    if (!compounds.length) return [0, 1];
    const vals = compounds.map((c) => priceOf(c, mode));
    return [Math.min(...vals), Math.max(...vals)];
  }, [compounds, mode]);

  return (
    <div
      style={{
        height,
        borderRadius: 'var(--r-card, 10px)',
        overflow: 'hidden',
        background: 'linear-gradient(180deg,#0d1a29,#060c14)',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 26, 34], fov: 42 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#060c14']} />
        <fog attach="fog" args={['#060c14', 55, 110]} />

        <ambientLight intensity={0.55} />
        <directionalLight
          position={[18, 30, 14]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <Environment preset="city" />

        <Ground />

        {compounds.map((c) => (
          <Tower
            key={c.n}
            compound={c}
            mode={mode}
            range={range}
            selected={selected?.n === c.n}
            onSelect={onSelect}
          />
        ))}

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.5}
          scale={SPREAD * 2.5}
          blur={2.4}
          far={14}
        />

        <OrbitControls
          enablePan
          minDistance={14}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 2, 0]}
        />
      </Canvas>
    </div>
  );
}
