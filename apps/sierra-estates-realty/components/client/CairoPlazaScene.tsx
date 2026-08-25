'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

type ViewKey = 'courtyard' | 'tower' | 'station';

const views: Record<ViewKey, { label: string; labelAr: string; camera: [number, number, number]; target: [number, number, number]; note: string; noteAr: string }> = {
  courtyard: { label: 'Courtyard', labelAr: 'الساحة الداخلية', camera: [6, 3.6, 7], target: [0, 0, 0], note: 'Explore the shared public realm and tower massing.', noteAr: 'استكشف الساحة العامة وكتلة الأبراج.' },
  tower: { label: 'Tower frontage', labelAr: 'واجهة البرج', camera: [3.2, 2.6, 4.3], target: [0, 0.5, 0], note: 'Inspect the illustrative tower frontage and façade rhythm.', noteAr: 'استعرض واجهة البرج الإيضاحية وإيقاع الواجهة.' },
  station: { label: 'Metro-station approach', labelAr: 'واجهة محطة المترو', camera: [-5.3, 2.8, 5.5], target: [0, 0.2, 0], note: 'View the project massing from the Al-Mataria Metro Station approach.', noteAr: 'شاهد كتلة المشروع من جهة الاقتراب أمام محطة مترو المطرية.' },
};

function PlazaMassing() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.025; });
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

function CameraPreset({ view, controls }: { view: ViewKey; controls: React.MutableRefObject<any> }) {
  const lastView = useRef<ViewKey | null>(null);
  useFrame(() => {
    if (lastView.current === view || !controls.current) return;
    const preset = views[view];
    controls.current.object.position.set(...preset.camera);
    controls.current.target.set(...preset.target);
    controls.current.update();
    lastView.current = view;
  });
  return null;
}

export default function CairoPlazaScene({ lang = 'en' }: { lang?: 'en' | 'ar' }) {
  const isAr = lang === 'ar';
  const controls = useRef<any>(null);
  const [view, setView] = useState<ViewKey>('courtyard');
  const [autoRotate, setAutoRotate] = useState(true);
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const active = views[view];

  const reset = () => {
    setView('courtyard');
    setAutoRotate(!reducedMotion);
  };

  return (
    <div className="cp-scene cp-tour-shell" aria-label={isAr ? 'جولة افتراضية ثلاثية الأبعاد لكايرو بلازا' : 'Interactive Cairo Plaza 3D virtual tour'}>
      <Canvas camera={{ position: views.courtyard.camera, fov: 42 }} shadows dpr={[1, 1.5]} fallback={<div className="cp-tour-fallback">{isAr ? 'الجولة الافتراضية غير متاحة في هذا المتصفح.' : 'The virtual tour is unavailable in this browser.'}</div>}>
        <color attach="background" args={['#0b1118']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 8, 5]} intensity={2.6} castShadow />
        <Float speed={0.5} rotationIntensity={0.06} floatIntensity={0.1}><PlazaMassing /></Float>
        <Environment preset="city" />
        <CameraPreset view={view} controls={controls} />
        <OrbitControls ref={controls} enablePan={false} minDistance={5} maxDistance={13} autoRotate={autoRotate && !reducedMotion} autoRotateSpeed={0.35} enableDamping />
      </Canvas>
      <div className="cp-tour-top" dir={isAr ? 'rtl' : 'ltr'}>
        <div><strong>{isAr ? 'جولة كايرو بلازا ثلاثية الأبعاد' : 'Cairo Plaza 3D virtual tour'}</strong><span>{isAr ? 'تصور تفاعلي توضيحي — ليس نموذجًا تنفيذيًا' : 'Illustrative interactive visualization — not an execution model'}</span></div>
        <button className="cp-tour-reset" type="button" onClick={reset}>{isAr ? 'إعادة ضبط' : 'Reset view'}</button>
      </div>
      <div className="cp-tour-bottom" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="cp-tour-note">{isAr ? active.noteAr : active.note}</div>
        <div className="cp-tour-hotspots">
          {(Object.keys(views) as ViewKey[]).map((key) => <button key={key} type="button" className={`cp-tour-hotspot ${view === key ? 'is-active' : ''}`} onClick={() => setView(key)}>{isAr ? views[key].labelAr : views[key].label}</button>)}
          <button type="button" className="cp-tour-hotspot cp-tour-toggle" onClick={() => setAutoRotate((current) => !current)}>{autoRotate ? (isAr ? 'إيقاف الدوران' : 'Pause rotation') : (isAr ? 'تشغيل الدوران' : 'Play rotation')}</button>
        </div>
      </div>
    </div>
  );
}
