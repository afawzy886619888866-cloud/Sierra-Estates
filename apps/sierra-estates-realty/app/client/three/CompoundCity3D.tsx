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
 * Scene design: a bright "daylight" look — the canvas renders transparent
 * over an ivory-to-sky gradient in the wrapper, the ground is a light
 * sand-blue plane with a soft grid, and warm directional + hemisphere lights
 * make the gold towers glow. Motion: towers grow out of the ground with a
 * stagger on mount, the selected tower breathes, and the camera slowly
 * auto-orbits until the visitor grabs it (paused while a compound is picked).
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
  index,
  onSelect,
}: {
  compound: Compound;
  mode: PriceMode;
  range: [number, number];
  selected: boolean;
  index: number;
  onSelect: (c: Compound) => void;
}) {
  const scaleGroup = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [grown, setGrown] = useState(false);
  const born = useRef<number | null>(null);

  const [x, z] = useMemo(() => project(compound.c), [compound.c]);

  // Normalised price 0..1 within the current dataset range, driving height + colour.
  const norm = useMemo(() => {
    const [lo, hi] = range;
    if (hi <= lo) return 0.5;
    return Math.min(1, Math.max(0, (priceOf(compound, mode) - lo) / (hi - lo)));
  }, [compound, mode, range]);

  const height = MIN_H + norm * (MAX_H - MIN_H);

  const color = useMemo(() => {
    const c = COLD.clone();
    // Two-stop ramp so mid-market compounds stay readable against the ground.
    return norm < 0.5
      ? c.lerp(WARM, norm * 2)
      : WARM.clone().lerp(HOT, (norm - 0.5) * 2);
  }, [norm]);

  // Mount stagger: each tower starts growing `index * 45ms` after its siblings,
  // easing out of the ground; afterwards hover/selection lift the scale.
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (born.current === null) born.current = t + index * 0.045;
    const p = THREE.MathUtils.clamp((t - born.current) / 0.7, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    if (p >= 1 && !grown) setGrown(true);

    if (scaleGroup.current) {
      const target = eased * (selected ? 1.16 : hovered ? 1.07 : 1);
      const s = scaleGroup.current.scale;
      s.y += (target - s.y) * Math.min(1, delta * 9);
    }
    if (material.current) {
      // Selected tower breathes; hovered gets a steady lift; resting stays calm.
      material.current.emissiveIntensity = selected
        ? 0.48 + Math.sin(t * 3.1) * 0.16
        : hovered
        ? 0.42
        : 0.14;
    }
  });

  const active = selected || hovered;

  return (
    <group position={[x, 0, z]}>
      <group ref={scaleGroup} scale={[1, 0.001, 1]}>
        <mesh
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
            ref={material}
            color={color}
            emissive={color}
            emissiveIntensity={0.14}
            metalness={0.3}
            roughness={0.34}
          />
        </mesh>
      </group>

      {/* Price billboard — mounts after the tower has grown so it doesn't
          hover over an empty lot; white pill on the light sky, gold when
          selected. */}
      {grown && (
        <Html
          position={[0, height + (active ? 1.5 : 1.05), 0]}
          center
          distanceFactor={30}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="se-3d-billboard"
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
              color: selected ? '#231a06' : '#0d2136',
              background: selected
                ? 'linear-gradient(135deg,#f5d78e,#c8961a)'
                : 'rgba(255,255,255,.94)',
              border: selected
                ? '2px solid #ffffff'
                : '1.5px solid rgba(200,150,26,.45)',
              boxShadow: selected
                ? '0 6px 18px rgba(200,150,26,.45)'
                : '0 4px 14px rgba(13,33,54,.18)',
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
      )}
    </group>
  );
}

/** Bright ground plane standing in for the New Cairo sand. */
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[SPREAD * 3, SPREAD * 3]} />
        <meshStandardMaterial color="#e4ebf3" roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[SPREAD * 3, 36, '#c2d1e2', '#d4dfea']} />
    </>
  );
}

/** Billboard entrance + scene-local styles (kept inside the component so the
 *  3D bundle stays self-contained wherever it is mounted). */
const SCENE_CSS = `
@keyframes se-3d-bill-in{from{opacity:0;transform:translateY(8px) scale(.85)}to{opacity:1;transform:none}}
.se-3d-billboard{animation:se-3d-bill-in .4s cubic-bezier(.16,1,.3,1) both;transition:padding .18s ease,font-size .18s ease}
@media(prefers-reduced-motion:reduce){.se-3d-billboard{animation:none}}
`;

export default function CompoundCity3D({
  compounds,
  mode,
  selected,
  onSelectAction,
  onSelect = onSelectAction,
  height = 560,
}: {
  compounds: Compound[];
  mode: PriceMode;
  selected: Compound | null;
  onSelectAction?: (c: Compound) => void;
  onSelect?: (c: Compound) => void;
  height?: number;
}) {
  const handleSelect = onSelectAction || onSelect || (() => {});
  // Slow cinematic orbit on load; permanently off once the visitor grabs the
  // camera, and paused while a compound is selected so the detail rail and the
  // scene stay steady for reading.
  const [autoSpin, setAutoSpin] = useState(true);

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
        // Bright ivory → sky gradient shows through the transparent canvas.
        background: 'linear-gradient(180deg,#f7fafd 0%,#e9f0f8 46%,#f0ecdf 100%)',
        position: 'relative',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCENE_CSS }} />
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 26, 34], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Transparent background (no <color attach="background">) so the
            wrapper's daylight gradient reads as the sky. Fog tints distant
            geometry toward the horizon tone. */}
        <fog attach="fog" args={['#ecf1f8', 60, 135]} />

        <ambientLight intensity={0.85} />
        <hemisphereLight args={['#eef4fb', '#e8dcc6', 0.55]} />
        <directionalLight
          position={[18, 30, 14]}
          intensity={1.35}
          color="#fff2d9"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <Environment preset="city" />

        <Ground />

        {compounds.map((c, i) => (
          <Tower
            key={c.n}
            compound={c}
            mode={mode}
            range={range}
            selected={selected?.n === c.n}
            index={i}
            onSelect={handleSelect}
          />
        ))}

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.28}
          scale={SPREAD * 2.5}
          blur={2.8}
          far={14}
          color="#5b6b85"
        />

        <OrbitControls
          enablePan
          minDistance={14}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 2, 0]}
          autoRotate={autoSpin && !selected}
          autoRotateSpeed={0.5}
          onStart={() => setAutoSpin(false)}
        />
      </Canvas>
    </div>
  );
}
