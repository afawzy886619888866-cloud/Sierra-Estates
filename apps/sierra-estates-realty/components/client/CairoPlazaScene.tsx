'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, OrbitControls, useTexture, Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import Image from 'next/image';
import { Layers, Compass, Maximize2, Minimize2, Sparkles, Sun, Moon, MapPin, CheckCircle2 } from 'lucide-react';

const SATELLITE_UNDERLAY = '/cairo-plaza/site-satellite.jpg';
const PANORAMA_TEXTURE = '/cairo-plaza/real-site-panorama.jpg';
const FACADE_TEXTURE = '/cairo-plaza/alfa-banque-misr-frontage.png';
const TOWER_TEXTURE = '/cairo-plaza/tower-frontage-detail.png';
const ENTRANCE_TEXTURE = '/cairo-plaza/real-entrance-enhanced.png';

type ViewMode = 'model' | 'panorama360';
type LightingMode = 'day' | 'golden' | 'night';
type ViewKey = 'courtyard' | 'tower' | 'station' | 'facade' | 'aerial';

interface HotspotData {
  id: string;
  position: [number, number, number];
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  realImg: string;
  badgeEn: string;
  badgeAr: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
}

const hotspots: HotspotData[] = [
  {
    id: 'banque-misr',
    position: [0, 0.2, 1.2],
    titleEn: 'Banque Misr & Retail Frontage',
    titleAr: 'واجهة بنك مصر والمحلات التجارية',
    descEn: 'Active high-footfall ground commercial frontage with premier banking operations.',
    descAr: 'واجهة تجارية رئيسية نشطة بحركة مشاة مكثفة مع فرع تشغيلي لبنك مصر.',
    realImg: '/cairo-plaza/real-facade-ai-enhanced.jpg',
    badgeEn: 'VERIFIED REAL SITE',
    badgeAr: 'دليل موقع حقيقي',
    cameraPos: [0, 1.5, 3.8],
    cameraTarget: [0, 0.4, 0.6],
  },
  {
    id: 'tower-elevation',
    position: [-2.1, 1.8, 0.3],
    titleEn: 'Tower 1 Commercial & Medical Elevation',
    titleAr: 'واجهة البرج الأول (تجاري وإداري)',
    descEn: 'Architectural structural framework with glass curtain wall design and high ceilings.',
    descAr: 'الهيكل الخرساني والإنشائي للبرج مع واجهات زجاجية واسعة وارتفاعات فندقية.',
    realImg: '/cairo-plaza/real-tower-frontage-ai-enhanced.jpg',
    badgeEn: 'ON-SITE TOWER EVIDENCE',
    badgeAr: 'توثيق البرج الميداني',
    cameraPos: [-3.8, 2.6, 3.5],
    cameraTarget: [-2.1, 1.2, 0],
  },
  {
    id: 'metro-concourse',
    position: [-3.2, -0.6, 2.2],
    titleEn: 'Al-Mataria Metro Station Concourse',
    titleAr: 'المحور المباشر لمحطة مترو المطرية',
    descEn: 'Prime transit connectivity directly facing the Al-Mataria metro entrance gates.',
    descAr: 'ربط استراتيجي فوري بالمواصلات العامة مباشرة أمام بوابات محطة مترو المطرية.',
    realImg: '/cairo-plaza/real-frontage-context-ai-enhanced.jpg',
    badgeEn: 'TRANSIT HUB FRONTAGE',
    badgeAr: 'واجهة محطة المترو',
    cameraPos: [-5.2, 2.2, 5.0],
    cameraTarget: [-1.5, 0, 0.8],
  },
  {
    id: 'central-plaza',
    position: [0.6, -0.7, 0.2],
    titleEn: 'Central Open-Air Courtyard',
    titleAr: 'الساحة المركزية المفتوحة',
    descEn: 'Spacious integrated pedestrian realm, outdoor seating areas, and commercial promenades.',
    descAr: 'مساحة مفتوحة للمشاة والمطاعم والمقاهي تتوسط الأبراج السبعة.',
    realImg: '/cairo-plaza/real-site-context-ai-enhanced.jpg',
    badgeEn: 'PUBLIC REALM',
    badgeAr: 'الساحة العامة',
    cameraPos: [2.5, 2.8, 4.2],
    cameraTarget: [0, 0, 0],
  },
  {
    id: 'corporate-suites',
    position: [2.1, 1.4, 0.1],
    titleEn: 'Corporate HQ & Executive Suites',
    titleAr: 'المقرات الإدارية والشركات',
    descEn: 'Flexible floor plans starting from 115 m² with smart building infrastructure.',
    descAr: 'مساحات إدارية مرنة تبدأ من 115 م² مجهزة بالبنية التحتية الذكية.',
    realImg: '/cairo-plaza/real-interior-context-ai-enhanced.jpg',
    badgeEn: 'OFFICE SUITES',
    badgeAr: 'مكاتب ومقرات إدارية',
    cameraPos: [4.2, 2.4, 3.2],
    cameraTarget: [1.8, 0.8, 0],
  },
];

const cameraViews: Record<ViewKey, { labelEn: string; labelAr: string; camera: [number, number, number]; target: [number, number, number]; noteEn: string; noteAr: string }> = {
  courtyard: {
    labelEn: 'Courtyard Overview',
    labelAr: 'الساحة المركزية',
    camera: [5.8, 3.5, 6.8],
    target: [0, 0, 0],
    noteEn: 'Real-photo textured 3D towers surrounding the central public plaza.',
    noteAr: 'أبراج ثلاثية الأبعاد بملامس وصور حقيقية تحيط بالساحة المركزية.',
  },
  tower: {
    labelEn: 'Tower Elevation',
    labelAr: 'واجهة الأبراج',
    camera: [3.4, 2.8, 4.5],
    target: [0, 0.6, 0],
    noteEn: 'Inspect real architectural facade photo mapping on the main tower massing.',
    noteAr: 'فحص ملامس الواجهات الحقيقية على الكتلة المعمارية للأبراج.',
  },
  station: {
    labelEn: 'Metro Frontage',
    labelAr: 'واجهة محطة المترو',
    camera: [-5.4, 2.6, 5.2],
    target: [0, 0.2, 0],
    noteEn: 'Direct visual axis from Al-Mataria Metro Station access corridor.',
    noteAr: 'محور الرؤية المباشر من ممر محطة مترو المطرية الرئيسي.',
  },
  facade: {
    labelEn: 'Commercial Podium',
    labelAr: 'الواجهة التجارية',
    camera: [0, 1.6, 4.2],
    target: [0, 0.3, 0],
    noteEn: 'Ground-level retail and operational Banque Misr active frontage.',
    noteAr: 'الأنشطة التجارية الأرضية وواجهة بنك مصر التشغيلية.',
  },
  aerial: {
    labelEn: 'Masterplan Aerial',
    labelAr: 'إطلالة علوية شاملة',
    camera: [0.1, 9.5, 0.1],
    target: [0, 0, 0],
    noteEn: 'Complete site plot boundary over verified satellite imagery.',
    noteAr: 'مخطط الأرض الكامل متطابقاً مع صور الأقمار الصناعية.',
  },
};

// ── Real-Site Satellite Base Plane ──────────────────────────────────────────
function SatelliteGround() {
  const texture = useTexture(SATELLITE_UNDERLAY);
  const { gl } = useThree();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI;

  return (
    <group position={[0, -1.42, 0]}>
      {/* Real Satellite Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11, 11, 32, 32]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Outer Glow Perimeter Border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[11.1, 11.1]} />
        <meshBasicMaterial color="#c9a86a" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

// ── 3D Architectural Model with Real-Photo Facade Textures ───────────────────
function RealTexturedPlazaModel({ onSelectHotspot, activeHotspotId }: { onSelectHotspot: (h: HotspotData) => void; activeHotspotId: string | null }) {
  const group = useRef<THREE.Group>(null);
  
  // Load real photography textures for realistic 3D mapping
  const facadeTexture = useTexture(FACADE_TEXTURE);
  const towerTexture = useTexture(TOWER_TEXTURE);
  const entranceTexture = useTexture(ENTRANCE_TEXTURE);
  const { gl } = useThree();

  [facadeTexture, towerTexture, entranceTexture].forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
  });

  return (
    <group ref={group}>
      {/* ── Central Main Tower with Real Façade Photo Mapping ── */}
      <group position={[0, 0.4, 0]}>
        {/* Core Concrete Body */}
        <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[1.7, 4.2, 1.3]} />
          <meshStandardMaterial
            color="#142132"
            metalness={0.3}
            roughness={0.4}
            envMapIntensity={1.2}
          />
        </mesh>

        {/* Real Banque Misr & Retail Photo Front Panel */}
        <mesh position={[0, -0.6, 0.66]} castShadow>
          <planeGeometry args={[1.68, 2.2]} />
          <meshStandardMaterial
            map={facadeTexture}
            roughness={0.35}
            metalness={0.15}
            toneMapped={false}
          />
        </mesh>

        {/* Real Tower Glazing Detail Upper Panel */}
        <mesh position={[0, 1.1, 0.66]} castShadow>
          <planeGeometry args={[1.68, 1.8]} />
          <meshStandardMaterial
            map={towerTexture}
            roughness={0.25}
            metalness={0.35}
            toneMapped={false}
          />
        </mesh>

        {/* Golden Architectural Crown Finishes */}
        <mesh position={[0, 2.35, 0]}>
          <boxGeometry args={[1.8, 0.12, 1.4]} />
          <meshStandardMaterial color="#c9a86a" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[1.4, 0.18, 1.0]} />
          <meshStandardMaterial color="#e5c88b" metalness={0.8} roughness={0.2} emissive="#c9a86a" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* ── Left Tower (Tower 1 - Metro Wing) ── */}
      <group position={[-2.3, 0.1, 0.1]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 3.6, 1.15]} />
          <meshStandardMaterial color="#111c2a" metalness={0.3} roughness={0.45} />
        </mesh>
        {/* Real Photo Facade Panel on Street Front */}
        <mesh position={[0, 0, 0.585]}>
          <planeGeometry args={[1.38, 3.4]} />
          <meshStandardMaterial map={towerTexture} roughness={0.3} metalness={0.2} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.85, 0]}>
          <boxGeometry args={[1.45, 0.1, 1.2]} />
          <meshStandardMaterial color="#c9a86a" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* ── Right Tower (Tower 2 - Executive & Medical) ── */}
      <group position={[2.3, 0.05, -0.1]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.45, 3.8, 1.2]} />
          <meshStandardMaterial color="#111c2a" metalness={0.3} roughness={0.45} />
        </mesh>
        {/* Real Entrance Photo Panel */}
        <mesh position={[0, -0.5, 0.61]}>
          <planeGeometry args={[1.42, 2.4]} />
          <meshStandardMaterial map={entranceTexture} roughness={0.3} metalness={0.15} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[1.5, 0.1, 1.25]} />
          <meshStandardMaterial color="#c9a86a" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* ── Rear Towers Forming the Complete 7-Tower Complex ── */}
      {[
        [-2.0, 0.5, -1.8, 1.3, 4.4, 1.1],
        [0.0, 0.8, -2.1, 1.6, 5.0, 1.2],
        [2.0, 0.4, -1.9, 1.3, 4.2, 1.1],
        [3.6, -0.2, 0.4, 1.1, 3.0, 1.0],
      ].map(([x, y, z, w, h, d], idx) => (
        <group key={idx} position={[x, y, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={idx === 1 ? '#18283d' : '#101a26'} metalness={0.35} roughness={0.4} />
          </mesh>
          <mesh position={[0, (h as number) / 2 + 0.06, 0]}>
            <boxGeometry args={[(w as number) + 0.05, 0.08, (d as number) + 0.05]} />
            <meshStandardMaterial color="#c9a86a" metalness={0.7} roughness={0.25} />
          </mesh>
        </group>
      ))}

      {/* ── Commercial Podium & Connecting Plazas ── */}
      <mesh position={[0, -1.0, 0.3]} receiveShadow>
        <boxGeometry args={[6.2, 0.8, 2.6]} />
        <meshStandardMaterial color="#0c1520" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Glowing Architectural LED Ribbon Lines */}
      <mesh position={[0, -0.6, 1.62]}>
        <boxGeometry args={[6.1, 0.04, 0.04]} />
        <meshBasicMaterial color="#e5c88b" />
      </mesh>
      <mesh position={[0, -0.98, 1.62]}>
        <boxGeometry args={[6.1, 0.03, 0.03]} />
        <meshBasicMaterial color="#00aeff" />
      </mesh>

      {/* ── 3D Interactive Hotspot Markers ── */}
      {hotspots.map((h) => {
        const isActive = activeHotspotId === h.id;
        return (
          <group key={h.id} position={h.position}>
            <mesh onClick={() => onSelectHotspot(h)}>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshStandardMaterial
                color={isActive ? '#00e5ff' : '#c9a86a'}
                emissive={isActive ? '#00aeff' : '#c9a86a'}
                emissiveIntensity={isActive ? 1.5 : 0.8}
              />
            </mesh>
            {/* Pulsing Beacon Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.18, 0.26, 32]} />
              <meshBasicMaterial
                color={isActive ? '#00e5ff' : '#c9a86a'}
                transparent
                opacity={isActive ? 0.9 : 0.55}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Html position={[0, 0.35, 0]} center distanceFactor={10}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHotspot(h);
                }}
                className={`cp-3d-pin ${isActive ? 'is-active' : ''}`}
                style={{
                  background: isActive ? 'linear-gradient(135deg, #00aeff, #0077b6)' : 'rgba(11, 17, 24, 0.92)',
                  color: '#fff',
                  border: isActive ? '1.5px solid #fff' : '1px solid rgba(201, 168, 106, 0.6)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: isActive ? '0 0 16px rgba(0, 174, 255, 0.8)' : '0 4px 12px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isActive ? '#fff' : '#c9a86a',
                    boxShadow: isActive ? '0 0 8px #fff' : 'none',
                  }}
                />
                <span>{h.titleEn.split('&')[0]}</span>
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ── 360° Real-Site Photosphere Inverted Dome ────────────────────────────────
function RealSitePanoramaDome() {
  const texture = useTexture(PANORAMA_TEXTURE);
  const { gl } = useThree();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1; // Invert horizontally for correct internal 360 viewing

  return (
    <Sphere args={[22, 60, 40]} scale={[-1, 1, 1]}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </Sphere>
  );
}

// ── Smooth Camera Transition Controller ────────────────────────────────────
function SmoothCameraController({
  targetPos,
  targetLookAt,
  controlsRef,
}: {
  targetPos: [number, number, number];
  targetLookAt: [number, number, number];
  controlsRef: React.MutableRefObject<any>;
}) {
  const currentPos = useRef(new THREE.Vector3(...targetPos));
  const currentTarget = useRef(new THREE.Vector3(...targetLookAt));

  useFrame(() => {
    if (!controlsRef.current) return;
    const destPos = new THREE.Vector3(...targetPos);
    const destTarget = new THREE.Vector3(...targetLookAt);

    currentPos.current.lerp(destPos, 0.06);
    currentTarget.current.lerp(destTarget, 0.06);

    controlsRef.current.object.position.copy(currentPos.current);
    controlsRef.current.target.copy(currentTarget.current);
    controlsRef.current.update();
  });

  return null;
}

export default function CairoPlazaScene({ lang = 'en' }: { lang?: 'en' | 'ar' }) {
  const isAr = lang === 'ar';
  const controls = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [viewMode, setViewMode] = useState<ViewMode>('model');
  const [viewKey, setViewKey] = useState<ViewKey>('courtyard');
  const [lighting, setLighting] = useState<LightingMode>('golden');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<HotspotData | null>(null);

  // Camera Target Calculation
  const cameraSettings = useMemo(() => {
    if (viewMode === 'panorama360') {
      return { pos: [0.1, 0, 0.1] as [number, number, number], target: [0, 0, 10] as [number, number, number] };
    }
    if (activeHotspot) {
      return { pos: activeHotspot.cameraPos, target: activeHotspot.cameraTarget };
    }
    return { pos: cameraViews[viewKey].camera, target: cameraViews[viewKey].target };
  }, [viewMode, activeHotspot, viewKey]);

  const handleSelectHotspot = (h: HotspotData) => {
    if (activeHotspot?.id === h.id) {
      setActiveHotspot(null);
    } else {
      setActiveHotspot(h);
    }
  };

  const handleSelectPresetView = (key: ViewKey) => {
    setViewKey(key);
    setActiveHotspot(null);
    if (viewMode !== 'model') setViewMode('model');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const resetCamera = () => {
    setViewKey('courtyard');
    setActiveHotspot(null);
    setViewMode('model');
    setAutoRotate(true);
  };

  return (
    <div
      ref={containerRef}
      className={`cp-scene cp-tour-shell ${isFullscreen ? 'is-fullscreen' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : 'clamp(520px, 65vh, 720px)',
        borderRadius: isFullscreen ? '0' : '20px',
        overflow: 'hidden',
        border: '1px solid rgba(201, 168, 106, 0.3)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
        background: '#070d14',
      }}
      aria-label={isAr ? 'جولة ثلاثية الأبعاد تفاعلية وصور حقيقية لكايرو بلازا' : 'Interactive 3D tour with real photos for Cairo Plaza'}
    >
      <Canvas
        camera={{ position: cameraViews.courtyard.camera, fov: 42 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        fallback={<div className="cp-tour-fallback">{isAr ? 'الجولة الافتراضية غير متاحة في هذا المتصفح.' : 'The 3D tour is unavailable in this browser.'}</div>}
      >
        <color attach="background" args={lighting === 'night' ? ['#05090f'] : lighting === 'golden' ? ['#0a131f'] : ['#0e1b2b']} />

        {/* Dynamic Lighting Setups */}
        <ambientLight intensity={lighting === 'night' ? 0.6 : lighting === 'golden' ? 1.4 : 2.0} />
        <directionalLight
          position={[6, 12, 8]}
          intensity={lighting === 'night' ? 1.0 : lighting === 'golden' ? 3.0 : 3.6}
          color={lighting === 'golden' ? '#ffd899' : '#ffffff'}
          castShadow
          shadow-mapSize={2048}
        />
        <directionalLight
          position={[-8, 6, -6]}
          intensity={lighting === 'night' ? 0.5 : 1.2}
          color={lighting === 'night' ? '#00aeff' : '#e0e7ff'}
        />

        <React.Suspense fallback={null}>
          {viewMode === 'model' ? (
            <>
              <SatelliteGround />
              <Float speed={autoRotate ? 0.6 : 0} rotationIntensity={0.02} floatIntensity={0.05}>
                <RealTexturedPlazaModel onSelectHotspot={handleSelectHotspot} activeHotspotId={activeHotspot?.id || null} />
              </Float>
              <Environment preset={lighting === 'night' ? 'night' : 'city'} />
            </>
          ) : (
            <RealSitePanoramaDome />
          )}
        </React.Suspense>

        <SmoothCameraController
          targetPos={cameraSettings.pos}
          targetLookAt={cameraSettings.target}
          controlsRef={controls}
        />

        <OrbitControls
          ref={controls}
          enablePan={viewMode === 'model'}
          minDistance={viewMode === 'panorama360' ? 0.1 : 3.5}
          maxDistance={viewMode === 'panorama360' ? 2 : 16}
          autoRotate={autoRotate && !activeHotspot}
          autoRotateSpeed={0.4}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      {/* ── Top Floating Control Bar ────────────────────────────────────────── */}
      <div
        className="cp-tour-top"
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(11, 17, 24, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(201, 168, 106, 0.35)',
            borderRadius: '14px',
            padding: '10px 16px',
            pointerEvents: 'auto',
            maxWidth: '380px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
            <strong style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
              {isAr ? 'كايرو بلازا — تجربة ثلاثية الأبعاد وصور حقيقية' : 'Cairo Plaza — 3D Model & Real-Site Photosphere'}
            </strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>
            {viewMode === 'model'
              ? (isAr ? 'أبراج بملامس وصور حقيقية من الموقع وأرضية أقمار صناعية موثقة' : 'Real-site photo textured towers & verified satellite underlay')
              : (isAr ? 'بانوراما كروية حقيقية 360° من قلب موقع الإنشاء' : '360° Real-site spherical capture inside the actual construction plot')}
          </span>
        </div>

        {/* Top Right Quick Actions */}
        <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
          {/* View Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(11, 17, 24, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(201, 168, 106, 0.35)',
              borderRadius: '12px',
              padding: '3px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setViewMode('model');
                setActiveHotspot(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'model' ? 'linear-gradient(135deg, #c9a86a, #dfc38c)' : 'transparent',
                color: viewMode === 'model' ? '#0b1118' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Layers style={{ width: 14, height: 14 }} />
              {isAr ? 'المجسم والواجهات الحقيقية' : '3D Facade Model'}
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('panorama360');
                setActiveHotspot(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'panorama360' ? 'linear-gradient(135deg, #00aeff, #0077b6)' : 'transparent',
                color: viewMode === 'panorama360' ? '#fff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Compass style={{ width: 14, height: 14 }} />
              {isAr ? 'بانوراما 360° من الموقع' : '360° Real Site'}
            </button>
          </div>

          {/* Lighting Selector (Day / Golden / Night) */}
          {viewMode === 'model' && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(11, 17, 24, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '3px',
                gap: '3px',
              }}
            >
              <button
                type="button"
                title={isAr ? 'إضاءة ذهبية' : 'Golden Hour'}
                onClick={() => setLighting('golden')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: lighting === 'golden' ? 'rgba(201, 168, 106, 0.3)' : 'transparent',
                  color: lighting === 'golden' ? '#e5c88b' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
              </button>
              <button
                type="button"
                title={isAr ? 'إضاءة نهارية' : 'Daylight'}
                onClick={() => setLighting('day')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: lighting === 'day' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: lighting === 'day' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <Sun style={{ width: 14, height: 14 }} />
              </button>
              <button
                type="button"
                title={isAr ? 'إضاءة ليلية معمارية' : 'Night Architectural'}
                onClick={() => setLighting('night')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: lighting === 'night' ? 'rgba(0, 174, 255, 0.25)' : 'transparent',
                  color: lighting === 'night' ? '#00aeff' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <Moon style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}

          {/* Fullscreen & Reset */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(11, 17, 24, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isAr ? 'ملء الشاشة' : 'Toggle Fullscreen'}
          >
            {isFullscreen ? <Minimize2 style={{ width: 14, height: 14 }} /> : <Maximize2 style={{ width: 14, height: 14 }} />}
          </button>
          <button
            type="button"
            onClick={resetCamera}
            style={{
              background: 'rgba(11, 17, 24, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(201, 168, 106, 0.4)',
              borderRadius: '12px',
              padding: '8px 14px',
              color: '#c9a86a',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            {isAr ? 'إعادة ضبط' : 'Reset'}
          </button>
        </div>
      </div>

      {/* ── Active Hotspot Real-Photo Inspection Card Overlay ────────────── */}
      {activeHotspot && (
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            bottom: '80px',
            right: isAr ? 'auto' : '20px',
            left: isAr ? '20px' : 'auto',
            zIndex: 15,
            width: 'clamp(280px, 32vw, 360px)',
            background: 'rgba(11, 17, 24, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(201, 168, 106, 0.5)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Real Photo Thumbnail */}
          <div style={{ position: 'relative', width: '100%', height: '140px' }}>
            <Image
              src={activeHotspot.realImg}
              alt={isAr ? activeHotspot.titleAr : activeHotspot.titleEn}
              fill
              style={{ objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: isAr ? 'auto' : '10px',
                right: isAr ? '10px' : 'auto',
                background: 'rgba(0, 43, 75, 0.9)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                border: '1px solid rgba(0, 174, 255, 0.4)',
              }}
            >
              {isAr ? activeHotspot.badgeAr : activeHotspot.badgeEn}
            </div>
            <button
              type="button"
              onClick={() => setActiveHotspot(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: isAr ? 'auto' : '10px',
                left: isAr ? '10px' : 'auto',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '14px 16px' }}>
            <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
              {isAr ? activeHotspot.titleAr : activeHotspot.titleEn}
            </strong>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.45, margin: 0 }}>
              {isAr ? activeHotspot.descAr : activeHotspot.descEn}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              {isAr ? 'تمت مطابقة الصورة مع الهيكل الفعلي بالموقع' : 'Verified match with on-site physical coordinates'}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Floating Presets Bar ──────────────────────────────────── */}
      <div
        className="cp-tour-bottom"
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(11, 17, 24, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '8px 14px',
            color: '#cbd5e1',
            fontSize: '0.8rem',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MapPin style={{ width: 14, height: 14, color: '#c9a86a' }} />
          <span>{viewMode === 'model' ? (isAr ? cameraViews[viewKey].noteAr : cameraViews[viewKey].noteEn) : (isAr ? 'اسحب الماوس للدوران بزاوية 360° داخل الموقع الحقيقي' : 'Drag to look around in 360° inside the actual real site')}</span>
        </div>

        {/* Hotspot & Preset View Angle Buttons */}
        {viewMode === 'model' && (
          <div
            className="cp-tour-hotspots"
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              pointerEvents: 'auto',
              justifyContent: 'flex-end',
            }}
          >
            {(Object.keys(cameraViews) as ViewKey[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`cp-tour-hotspot ${viewKey === k && !activeHotspot ? 'is-active' : ''}`}
                onClick={() => handleSelectPresetView(k)}
                style={{
                  background: viewKey === k && !activeHotspot ? 'linear-gradient(135deg, #c9a86a, #dfc38c)' : 'rgba(11, 17, 24, 0.88)',
                  color: viewKey === k && !activeHotspot ? '#0b1118' : '#e2e8f0',
                  border: viewKey === k && !activeHotspot ? '1px solid #c9a86a' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isAr ? cameraViews[k].labelAr : cameraViews[k].labelEn}
              </button>
            ))}

            {/* Rotation Toggle */}
            <button
              type="button"
              className="cp-tour-hotspot cp-tour-toggle"
              onClick={() => setAutoRotate((curr) => !curr)}
              style={{
                background: autoRotate ? 'rgba(0, 174, 255, 0.15)' : 'rgba(11, 17, 24, 0.88)',
                color: autoRotate ? '#00aeff' : '#94a3b8',
                border: autoRotate ? '1px solid #00aeff' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              {autoRotate ? (isAr ? 'إيقاف الدوران' : 'Pause Orbit') : (isAr ? 'تشغيل الدوران' : 'Auto Orbit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
