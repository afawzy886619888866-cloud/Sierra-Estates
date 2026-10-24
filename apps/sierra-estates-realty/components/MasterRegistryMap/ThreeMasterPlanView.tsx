'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COMPOUNDS, Compound } from './registryData';
import { Box, Eye, Layers, Compass, Table2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface ThreeMasterPlanViewProps {
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onSelectCompoundToExcel: (compound: Compound) => void;
}

// Pre-allocated scratch objects for zero-GC animation loop
const _vec3 = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

export const ThreeMasterPlanView: React.FC<ThreeMasterPlanViewProps> = ({
  lang,
  isDarkMode,
  onSelectCompoundToExcel,
}) => {
  const isAr = lang === 'ar';
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedCompound, setSelectedCompound] = useState<Compound>(COMPOUNDS[0]);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'auc' | 'golden' | 'cinematic'>('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // References to communicate with three loop without re-triggering effect
  const activePresetRef = useRef<'overview' | 'auc' | 'golden' | 'cinematic'>('overview');
  const hoveredMeshRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    activePresetRef.current = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x050b14 : 0xf2ece1);
    scene.fog = new THREE.FogExp2(isDarkMode ? 0x050b14 : 0xf2ece1, 0.007);

    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(0, 75, 110);
    camera.lookAt(0, 0, 0);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({ antialias: !isHeadless, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Procedural Studio Environment (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Studio PBR Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff3db, 2.2);
    keyLight.position.set(50, 90, 40);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 250;
    const d = 80;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x90b5ff, 0x443322, 1.2);
    scene.add(hemiLight);

    // 4. Ground Terrain & Concentric Radial Grid
    const groundGeo = new THREE.PlaneGeometry(350, 350, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isDarkMode ? 0x091424 : 0xe8e1d5,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Concentric radial rings on ground
    const ringGroup = new THREE.Group();
    [20, 45, 75, 110].forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.25, r + 0.25, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0xd4af37 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isDarkMode ? 0.45 : 0.25,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      ringGroup.add(ring);
    });
    scene.add(ringGroup);

    // 5. Procedural 3D Compound Clusters (Composite 3-12 parts per compound)
    const interactiveGroups: THREE.Group[] = [];

    COMPOUNDS.forEach((c) => {
      // Map 0-100% X/Y to 3D world coords
      const worldX = (c.xPct - 50) * 2.2;
      const worldZ = (c.yPct - 50) * 1.6;

      const compoundGroup = new THREE.Group();
      compoundGroup.position.set(worldX, 0, worldZ);
      (compoundGroup as any).userData = { compound: c };

      // Base plot plinth
      const plinthGeo = new THREE.CylinderGeometry(8, 8.5, 0.6, 24);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: c.zoneEn.includes('Golden Square') ? 0xd4af37 : 0x22354d,
        metalness: 0.5,
        roughness: 0.35,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = 0.3;
      plinth.receiveShadow = true;
      compoundGroup.add(plinth);

      // 3-6 Procedural Buildings per compound
      const buildingCount = 5;
      for (let i = 0; i < buildingCount; i++) {
        const h = 4 + (i * 2.5);
        const w = 2.5 + (i % 2);
        const bGeo = new THREE.BoxGeometry(w, h, w);
        const bMat = new THREE.MeshStandardMaterial({
          color: c.zoneEn.includes('Golden Square') ? 0xfaeed1 : 0xcedee9,
          metalness: 0.7,
          roughness: 0.2,
        });
        const building = new THREE.Mesh(bGeo, bMat);
        const angle = (i / buildingCount) * Math.PI * 2;
        const rad = 3.5;
        building.position.set(Math.cos(angle) * rad, h / 2 + 0.6, Math.sin(angle) * rad);
        building.castShadow = true;
        building.receiveShadow = true;
        compoundGroup.add(building);
      }

      // Center Spire / Beacon
      const spireGeo = new THREE.ConeGeometry(1.6, 16, 12);
      const spireMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.9,
      });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = 8 + 0.6;
      spire.castShadow = true;
      compoundGroup.add(spire);

      scene.add(compoundGroup);
      interactiveGroups.push(compoundGroup);
    });

    // 6. Central AUC Hub Structure
    const aucGroup = new THREE.Group();
    aucGroup.position.set(0, 0, 0);
    const aucDomeGeo = new THREE.SphereGeometry(6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const aucDomeMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.15,
      clearcoat: 1.0,
    });
    const aucDome = new THREE.Mesh(aucDomeGeo, aucDomeMat);
    aucDome.position.y = 0.5;
    aucDome.castShadow = true;
    aucGroup.add(aucDome);
    scene.add(aucGroup);

    // 7. Raycasting for Interaction
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);
      const intersects = _raycaster.intersectObjects(scene.children, true);

      let foundGroup: THREE.Group | null = null;
      for (const hit of intersects) {
        let parent = hit.object.parent;
        while (parent && parent !== scene) {
          if ((parent as any).userData?.compound) {
            foundGroup = parent as THREE.Group;
            break;
          }
          parent = parent.parent;
        }
        if (foundGroup) break;
      }

      hoveredMeshRef.current = foundGroup;
    };

    const handleClick = () => {
      if (hoveredMeshRef.current && (hoveredMeshRef.current as any).userData?.compound) {
        const comp = (hoveredMeshRef.current as any).userData.compound as Compound;
        setSelectedCompound(comp);
        onSelectCompoundToExcel(comp);
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);

    // 8. Animation & Damping Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const targetPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const dt = clock.getDelta();

      // Camera preset target positions
      const preset = activePresetRef.current;
      if (preset === 'overview') {
        targetPos.set(0, 90, 120);
        targetLookAt.set(0, 0, 0);
      } else if (preset === 'auc') {
        targetPos.set(0, 30, 45);
        targetLookAt.set(0, 0, 0);
      } else if (preset === 'golden') {
        targetPos.set(25, 40, 30);
        targetLookAt.set(15, 0, -5);
      } else if (preset === 'cinematic') {
        const time = clock.getElapsedTime() * 0.25;
        targetPos.set(Math.sin(time) * 95, 60, Math.cos(time) * 95);
        targetLookAt.set(0, 5, 0);
      }

      // Exponential damping on camera position
      camera.position.lerp(targetPos, 1 - Math.exp(-3.5 * dt));
      _vec3.lerp(targetLookAt, 1 - Math.exp(-3.5 * dt));
      camera.lookAt(_vec3);

      // Subtle rotation on hovering
      interactiveGroups.forEach((grp) => {
        const isHovered = grp === hoveredMeshRef.current;
        const targetScale = isHovered ? 1.15 : 1.0;
        grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, targetScale, 0.15));
      });

      renderer.render(scene, camera);
    };

    renderLoop();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDarkMode]);

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 py-4">
      {/* 3D Master Scene Frame */}
      <div className={`relative w-full aspect-[16/9] min-h-[550px] rounded-2xl overflow-hidden border-2 shadow-2xl ${
        isDarkMode ? 'border-amber-900/40 bg-[#050B14]' : 'border-[#B8860B]/40 bg-[#F2ECE1]'
      }`}>
        
        {/* Three.js Canvas Mount */}
        <div ref={mountRef} className="w-full h-full cursor-pointer" />

        {/* Top Minimal Spec Badge */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none bg-black/60 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-400 bg-stone-900 p-0.5">
            <img src="/assets/aistudio/8e9559f6f_image__1__4350f848.png" alt="Sierra Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-cinzel font-bold text-xs">
              NEW CAIRO 3D ARCHITECTURAL TWIN
            </div>
            <div className="text-[10px] font-mono text-amber-300">
              AUC HUB CENTER · 18 MAPPED CLUSTERS
            </div>
          </div>
        </div>

        {/* UNIFIED COLLAPSIBLE BOTTOM DOCK (<= 15% Viewport footprint as per Three.js skill) */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-25 max-w-[92vw] sm:max-w-xl w-full">
          {/* Collapse / Expand Tab */}
          <div className="flex justify-center -mb-px">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-3 py-1 rounded-t-lg bg-stone-900 text-stone-200 border-t border-x border-amber-500/30 text-[10px] font-mono flex items-center gap-1 cursor-pointer hover:bg-stone-800"
            >
              {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{isCollapsed ? (isAr ? 'إظهار لوحة التحكم 3D' : 'Show 3D Dock') : (isAr ? 'طي لوحة التحكم' : 'Collapse Dock')}</span>
            </button>
          </div>

          {!isCollapsed && (
            <div className="p-3 rounded-xl bg-stone-900/95 text-white border border-amber-500/40 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-1">
                <span className="text-stone-400 text-[10px] mr-1">{isAr ? 'زاوية الكاميرا:' : 'Camera:'}</span>
                {[
                  { id: 'overview', en: 'Overview', ar: 'شامل' },
                  { id: 'auc', en: 'AUC Center', ar: 'مركز AUC' },
                  { id: 'golden', en: 'Golden Sq', ar: 'المربع الذهبي' },
                  { id: 'cinematic', en: 'Orbit 360', ar: 'دوران سينمائي' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setCameraPreset(p.id as any)}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold cursor-pointer transition-colors ${
                      cameraPreset === p.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {isAr ? p.ar : p.en}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onSelectCompoundToExcel(selectedCompound)}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'فتح شيت الإكسيل' : 'Open in Excel Sheet'}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
