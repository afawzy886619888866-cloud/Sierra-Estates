import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import L from 'leaflet';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, createSierraNotification } from '../firebase';
import { Listing } from '../types';

// Let's import the leaflet styles dynamically if not loaded
const loadLeafletStyle = () => {
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
};

interface ClientHubProps {
  T: (key: string) => string;
  langKey: string;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  setTab: (t: string) => void;
  onEnterAdminSession: () => void;
}

const ALL_COMPOUNDS = [
  'Hyde Park', 'Mountain View iCity', 'Mountain View Hyde Park',
  'Uptown Cairo', 'Mivida', 'Madinaty', 'Eastown', 'El Shorouk',
  'Palm Hills NC', 'Villette', 'Fifth Square', 'SODIC East',
  'Taj City', 'Bloomfields', 'Sarai', 'Katameya Heights',
  'Al Rehab', 'Zed East', 'La Vista City'
];

const SCENES = [
  { bg: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80', thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=160&q=70', lbl: 'Exterior' },
  { bg: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1600&q=80', thumb: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=160&q=70', lbl: 'Living' },
  { bg: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80', thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=160&q=70', lbl: 'Garden' },
  { bg: 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=1600&q=80', thumb: 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=160&q=70', lbl: 'Pool' },
  { bg: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80', thumb: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=160&q=70', lbl: 'Night' },
];

const TOUR_ROOMS = [
  { name: 'Living Area', bg: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1600&q=85' },
  { name: 'Master Suite', bg: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1600&q=85' },
  { name: 'Private Garden', bg: 'https://images.unsplash.com/photo-1598228723793-52759bba239c?w=1600&q=85' },
  { name: 'Pool Deck', bg: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=85' },
  { name: 'Sky Terrace', bg: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85' },
  { name: 'Villa Exterior', bg: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1600&q=85' },
];

const HUB_IMGS = [
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=75',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=75',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=75',
  'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&q=75',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=75',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=75',
];

const MAP_COMPOUNDS = [
  { name: 'Mountain View iCity', coords: [30.0120, 31.5183] as [number, number], priceResale: 'EGP 11.2M', priceRent: '$3,700/mo', ai: 9.6, zone: '5th Settlement' },
  { name: 'Hyde Park', coords: [30.0083, 31.5447] as [number, number], priceResale: 'EGP 18.5M', priceRent: '$6,100/mo', ai: 9.8, zone: '5th Settlement' },
  { name: 'Mivida', coords: [30.0069, 31.4892] as [number, number], priceResale: 'EGP 5.8M', priceRent: '$1,900/mo', ai: 9.1, zone: '5th Settlement' },
  { name: 'Eastown', coords: [30.0181, 31.4867] as [number, number], priceResale: 'EGP 8.2M', priceRent: '$2,700/mo', ai: 9.0, zone: '5th Settlement' },
  { name: 'Palm Hills NC', coords: [30.0250, 31.5120] as [number, number], priceResale: 'EGP 12.4M', priceRent: '$4,100/mo', ai: 9.2, zone: '5th Settlement' },
  { name: 'Villette', coords: [30.0180, 31.5380] as [number, number], priceResale: 'EGP 9.8M', priceRent: '$3,200/mo', ai: 9.3, zone: '5th Settlement' },
  { name: 'Al Rehab', coords: [30.0620, 31.4420] as [number, number], priceResale: 'EGP 3.9M', priceRent: '$1,280/mo', ai: 8.7, zone: 'Al Rehab' },
  { name: 'Madinaty', coords: [30.1050, 31.6180] as [number, number], priceResale: 'EGP 4.5M', priceRent: '$1,480/mo', ai: 8.8, zone: 'Madinaty' },
  { name: 'El Shorouk', coords: [30.1350, 31.6120] as [number, number], priceResale: 'EGP 3.2M', priceRent: '$1,050/mo', ai: 8.5, zone: 'El Shorouk' },
  { name: 'Taj City', coords: [30.0080, 31.4522] as [number, number], priceResale: 'EGP 6.8M', priceRent: '$2,230/mo', ai: 8.9, zone: 'New Cairo' },
  { name: 'Sarai', coords: [29.9900, 31.5522] as [number, number], priceResale: 'EGP 7.4M', priceRent: '$2,430/mo', ai: 9.1, zone: 'New Cairo' },
  { name: 'SODIC East', coords: [30.0780, 31.5560] as [number, number], priceResale: 'EGP 9.2M', priceRent: '$3,020/mo', ai: 9.3, zone: 'New Cairo' },
];

const AI_RESP: Record<string, string> = {
  mivida: 'Mivida by SODIC: 2-bed units from EGP 5.2M. Avg rental $1,700/mo. AI Score 9.1/10 — strong expat demand.',
  hyde: 'Hyde Park: villas from EGP 22M. AI Score 9.8/10 — highest YoY appreciation (+22%). 3 units available today.',
  madinaty: 'Madinaty: 3-bed from EGP 4.8M — best value per m² in New Cairo. Excellent schools nearby.',
  invest: 'Top ROI: Mountain View iCity (+24%), Uptown Cairo (+31%), Hyde Park (+22%). Strong Q2 2026 signals.',
  rent: 'Best rental: Al Rehab from $1,280/mo, Madinaty $1,480/mo. Premium: Hyde Park from $6,100/mo.',
  default: "I'm Sierra AI — ask about any compound, ROI or budget and I'll find your perfect match in New Cairo.",
};

const NEARBY = [
  'British International School Cairo',
  'GEMS Cairo International',
  'Cairo American College',
  'AUC New Cairo',
  'Cairo Festival City Mall',
  'Point 90 Mall',
  'Waterway Restaurants',
  'New Cairo Sporting Club',
  '5th Settlement Ring Road',
  'Cairo Airport 30 min'
];

export default function ClientHub({
  T,
  langKey,
  theme,
  setTheme,
  setTab,
  onEnterAdminSession
}: ClientHubProps) {
  const isAr = langKey === 'ar';
  
  // Real Firestore listings
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Filters State
  const [mode, setMode] = useState<'all' | 'rent' | 'resale'>('all');
  const [selectedCompounds, setSelectedCompounds] = useState<string[]>([]);
  const [bedrooms, setRooms] = useState<number | null>(null);
  const [nearbyFilter, setNearbyFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('ai');

  // Search & requests state
  const [searchVal, setSearchVal] = useState('');
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartSubmitted, setSmartSubmitted] = useState(false);
  const [smartName, setSmartName] = useState('');
  const [smartWa, setSmartWa] = useState('');

  // Dropdowns state
  const [ddOpen, setOpen] = useState<'cpd' | 'rooms' | 'near' | null>(null);
  const [cmpQ, setCmpQ] = useState('');

  // 360 virtual tour state
  const [tourRoom, setTourRoom] = useState(0);
  const [tourHint, setTourHint] = useState(true);
  const [tourLoading, setTourLoading] = useState(true);

  // Chat fab state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMsgs, setChatMsgs] = useState<{ sender: 'ai' | 'user'; text: string; id: number }[]>([
    { sender: 'ai', text: AI_RESP.default, id: 1 }
  ]);
  const [chatTyping, setChatTyping] = useState(false);

  // Quick Request state
  const [qrName, setQrName] = useState('');
  const [qrWa, setQrWa] = useState('');
  const [qrCpd, setQrCpd] = useState('Any');
  const [qrBudget, setQrBudget] = useState('Any Budget');
  const [qrReqs, setQrReqs] = useState('');
  const [qrSubmitted, setQrSubmitted] = useState(false);

  // Compound detailed modal
  const [selCpd, setSelCpd] = useState<any>(null);

  // Ref hooks for dropdowns and panoramic container
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tourContainerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const heroParticlesRef = useRef<HTMLCanvasElement>(null);
  const heroBackgroundRef = useRef<HTMLDivElement>(null);

  // Map instance references
  const mapInstance = useRef<L.Map | null>(null);
  const mapIdRef = useRef<string>(`map-${Math.floor(Math.random() * 100000)}`);

  // Active Hero banner index slider state
  const [heroScene, setHeroScene] = useState(0);

  // 1. Listen to Firestore Listings
  useEffect(() => {
    loadLeafletStyle();

    const unsub = onSnapshot(collection(db, 'listings'), (snap) => {
      const loaded: Listing[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        loaded.push({
          id: doc.id,
          code: d.code,
          cmp: d.cmp,
          type: d.type,
          beds: d.beds,
          area: d.area,
          price: d.price,
          ai: d.ai,
          status: d.status,
          img: d.img || 0,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(),
        });
      });
      setListings(loaded);
      setLoadingListings(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'listings');
      setLoadingListings(false);
    });

    return () => unsub();
  }, []);

  // 2. Click outside dropdown listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 3. Compute matching listings dynamically
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      // Direct search keyword matches
      if (searchVal.trim()) {
        const searchLower = searchVal.toLowerCase();
        const matchesQuery = 
          l.code.toLowerCase().includes(searchLower) ||
          l.cmp.toLowerCase().includes(searchLower) ||
          l.type.toLowerCase().includes(searchLower);
        if (!matchesQuery) return false;
      }

      // Rent/Resale mode
      const isRentText = /شهر|\/mo|\/month|rent/i.test(l.price) || l.cmp.match(/rent/i);
      const isSearchForRent = mode === 'rent';
      if (mode !== 'all') {
        if (isSearchForRent && !isRentText) return false;
        if (!isSearchForRent && isRentText) return false;
      }

      // Selected compounds filters
      if (selectedCompounds.length > 0 && !selectedCompounds.includes(l.cmp)) {
        return false;
      }

      // Bedroom configuration matches
      if (bedrooms !== null && l.beds !== bedrooms) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sort === 'ai') return b.ai - a.ai;
      
      const priceA = parseFloat(a.price.replace(/[^\d.]/g, '')) || 0;
      const priceB = parseFloat(b.price.replace(/[^\d.]/g, '')) || 0;
      if (sort === 'pa') return priceA - priceB;
      if (sort === 'pd') return priceB - priceA;

      return b.area - a.area;
    });
  }, [listings, searchVal, mode, selectedCompounds, bedrooms, sort]);

  // 4. Submit Lead directly to Firestore
  const handleLeadSubmit = async (name: string, phone: string, cpd: string, budget: string, extraNote: string) => {
    if (!phone.trim()) return false;

    try {
      const cleanPhone = phone.trim();
      const cleanName = name.trim() || 'Prospective Buyer';
      const cleanInterest = `Interest in ${cpd} with budget ${budget}. ${extraNote}`.trim();

      // Write directly to Firestore Leads
      await addDoc(collection(db, 'leads'), {
        name: cleanName,
        phone: cleanPhone,
        interest: cleanInterest,
        stage: 'Initial Contact',
        color: ['#C8961A', '#1E88D9', '#34D399', '#7C3AED', '#E63946'][Math.floor(Math.random() * 5)],
        hot: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Launch team trigger notifications
      await createSierraNotification(
        'lead',
        `Lead Captured: ${cleanName}`,
        `A prospective buyer filled a property matching request on Client Hub. Phone: ${cleanPhone}, Brief: ${cleanInterest}`,
        `عميل مسجل جديد: ${cleanName}`,
        `قام عميل بطلب عقاري جديد عبر صفحة المعاينة. هاتف: ${cleanPhone}، التفاصيل: ${cleanInterest}`
      );
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // 5. Leaflet Map setup
  useEffect(() => {
    if (!mapRefValueIsValid() || mapInstance.current) return;

    const mapNode = document.getElementById(mapIdRef.current);
    if (!mapNode) return;

    // Dark high contrast tile theme matching standard requirements
    const map = L.map(mapIdRef.current, {
      center: [30.04, 31.50],
      zoom: 11,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    mapInstance.current = map;

    // Center map around compounds range
    map.fitBounds([
      [29.95, 31.35],
      [30.15, 31.65]
    ]);

    // Plot pins dynamically
    MAP_COMPOUNDS.forEach((c) => {
      // Find matching live unit quantity
      const liveCpdUnits = listings.filter((l) => l.cmp === c.name).length;
      const countToRender = liveCpdUnits > 0 ? liveCpdUnits : Math.floor(Math.random() * 8) + 4;

      const htmlPinMarkup = `
        <div class="flex flex-col items-center gap-[2px] cursor-pointer transform hover:scale-105 active:scale-95 transition">
          <div class="bg-slate-950/95 border-1.5 border-[#C8961A] text-[#F0E8C8] px-3.5 py-1.5 rounded-full font-mono text-[10px] font-extrabold whitespace-nowrap shadow-lg">
            ${countToRender} <span class="text-[8px] opacity-75 font-semibold">UNITS</span>
          </div>
          <div class="bg-[#C8961A]/20 border border-[#C8961A]/50 text-amber-200 px-2.5 py-0.5 rounded-lg font-mono text-[7.5px] font-bold whitespace-nowrap">
            ${c.name.split(' ').slice(0, 2).join(' ')}
          </div>
        </div>
      `;

      const pinIcon = L.divIcon({
        className: '',
        html: htmlPinMarkup,
        iconSize: [120, 48],
        iconAnchor: [60, 44]
      });

      const mk = L.marker(c.coords as L.LatLngExpression, { icon: pinIcon }).addTo(map);
      mk.on('click', () => {
        setSelCpd({
          name: c.name,
          units: countToRender,
          avgPrice: c.priceResale,
          aiScore: c.ai,
          zone: c.zone,
          priceResale: c.priceResale,
          priceRent: c.priceRent
        });
      });
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [listings]);

  function mapRefValueIsValid() {
    return !!document.getElementById(mapIdRef.current);
  }

  // 6. Three.js virtual tour rendering engine
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const threeMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  
  useEffect(() => {
    const el = tourContainerRef.current;
    if (!el || !THREE) return;

    const width = el.clientWidth || 800;
    const height = el.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.domElement.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
    
    // Clear old canvases
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    const s = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    cam.position.set(0, 0, 0.01);

    const geo = new THREE.SphereGeometry(500, 60, 40);
    geo.scale(-1, 1, 1); // orient geometry inside

    const mat = new THREE.MeshBasicMaterial({ color: 0x0a101d }); // fallback background color
    const mesh = new THREE.Mesh(geo, mat);
    s.add(mesh);

    threeRendererRef.current = renderer;
    threeSceneRef.current = s;
    threeCameraRef.current = cam;
    threeMaterialRef.current = mat;

    // Position spherical look variables
    let lat = 0;
    let lon = 0;
    let targetLat = 0;
    let targetLon = 0;
    let isDown = false;
    let startX = 0;
    let startY = 0;
    let prevLon = 0;
    let prevLat = 0;

    // Load sphere panoramic texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    const loadTexture = (url: string) => {
      setTourLoading(true);
      textureLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        mat.map = tex;
        mat.needsUpdate = true;
        setTourLoading(false);
      }, undefined, (e) => {
        console.error("Panoramas texture failure: ", e);
        setTourLoading(false);
      });
    };

    loadTexture(TOUR_ROOMS[tourRoom].bg);

    // Dynamic rotation animation loop
    let rafId: number;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      
      // Interpolate for ultra-velvety mouse smoothing drag response
      lon += (targetLon - lon) * 0.09;
      lat += (targetLat - lat) * 0.09;
      lat = Math.max(-85, Math.min(85, lat));

      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);

      const lookTarget = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );

      cam.lookAt(lookTarget);
      renderer.render(s, cam);
    };
    tick();

    // Event binding coordinates inside the tour container
    const onPointerDown = (clientX: number, clientY: number) => {
      isDown = true;
      startX = clientX;
      startY = clientY;
      prevLon = targetLon;
      prevLat = targetLat;
      setTourHint(false);
    };

    const onPointerMove = (clientX: number, clientY: number) => {
      if (!isDown) return;
      // Adjust drag sensitivity multiplier
      targetLon = prevLon - (clientX - startX) * 0.22;
      targetLat = Math.max(-85, Math.min(85, prevLat + (clientY - startY) * 0.22));
    };

    const onPointerUp = () => {
      isDown = false;
    };

    const handleResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w && h) {
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    // Attach listeners
    el.addEventListener('pointerdown', (e) => onPointerDown(e.clientX, e.clientY));
    el.addEventListener('pointermove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', handleResize);

    // Support mobile touch gestures explicitly
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    el.addEventListener('touchend', onPointerUp);

    // Expose control overrides directly
    (el as any).__pan = (dLon: number, dLat: number) => {
      targetLon += dLon;
      targetLat = Math.max(-85, Math.min(85, targetLat + dLat));
    };
    
    (el as any).__zoom = (factor: number) => {
      cam.fov = Math.max(35, Math.min(105, cam.fov + factor));
      cam.updateProjectionMatrix();
    };

    (el as any).__reset = () => {
      targetLon = 0;
      targetLat = 0;
      cam.fov = 75;
      cam.updateProjectionMatrix();
    };

    (el as any).__loadTexture = loadTexture;

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Three.js Texture when user swaps rooms
  useEffect(() => {
    const el = tourContainerRef.current;
    if (el && (el as any).__loadTexture) {
      (el as any).__loadTexture(TOUR_ROOMS[tourRoom].bg);
    }
  }, [tourRoom]);

  // 7. Ambient Particle drift canvas backdrop behind hero
  useEffect(() => {
    const canvas = heroParticlesRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth || window.innerWidth;
      canvas.height = canvas.offsetHeight || 600;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * (canvas?.width || 800),
      y: Math.random() * (canvas?.height || 600),
      r: Math.random() * 1.5 + 0.35,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -Math.random() * 0.35 - 0.08,
      op: Math.random() * 0.35 + 0.1
    }));

    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -4) {
          p.y = canvas.height + 4;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x,p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,150,26,${p.op})`;
        ctx.fill();
      });
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Triggering chat chatbot response simulation securely on database
  const sendChatMessage = (text: string) => {
    const queryTerm = text.trim();
    if (!queryTerm) return;

    const nextId = chatMsgs.length + 1;
    setChatMsgs((prev) => [...prev, { sender: 'user', text: queryTerm, id: nextId }]);
    setChatInput('');
    setChatTyping(true);

    const matchKey = Object.keys(AI_RESP).find((k) => queryTerm.toLowerCase().includes(k)) || 'default';
    const responseText = AI_RESP[matchKey];

    setTimeout(() => {
      setChatTyping(false);
      setChatMsgs((prev) => [
        ...prev,
        { sender: 'ai', text: responseText, id: nextId + 1 }
      ]);
    }, 1100);
  };

  return (
    <div className={`min-h-screen text-slate-300 font-sans selection:bg-[#C8961A]/30 overflow-hidden leading-relaxed ${theme === 'light' ? 'bg-[#FAF8F4] text-slate-900' : 'bg-[#07111E]'}`}>
      
      {/* ── CLIENT HUD NAVBAR ────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-[100] h-[56px] border-b flex items-center px-4 md:px-8 gap-4 backdrop-blur-md transition-all ${
        theme === 'light' ? 'bg-[#FAF8F4]/95 border-amber-500/10 shadow-sm' : 'bg-[#0a121e]/90 border-slate-800/80 shadow-2xl'
      }`}>
        <div className="flex items-center gap-3 select-none">
          <img
            src="assets/logo-gold.png"
            alt="Sierra Estates logo"
            className={`w-[26px] h-[26px] object-contain ${theme === 'dark' ? 'screen-blend' : 'multiply-blend'}`}
          />
          <span className="font-serif font-semibold tracking-[0.25em] text-xs uppercase text-[#C8961A] pr-3 border-r border-[#C8961A]/10">
            SIERRA ESTATES
          </span>
          <span className="font-mono text-[7px] tracking-[0.3em] font-extrabold uppercase text-slate-500">
            INTELLIGENCE OS 3.0
          </span>
        </div>

        {/* Central Smart Filter Bar */}
        <div className="hidden lg:flex flex-1 justify-center z-50">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-sm ${
            theme === 'light' ? 'bg-white border-amber-500/15' : 'bg-slate-950/60 border-slate-800'
          }`} ref={dropdownRef}>
            
            {/* Rent/Resale Mode Toggle */}
            <div className="flex bg-slate-900/50 p-[2px] rounded-lg border border-slate-800 mr-2 text-[9px] font-bold">
              <button 
                onClick={() => setMode('all')}
                className={`px-3 py-1 rounded transition ${mode === 'all' ? 'bg-[#C8961A]/20 text-[#C8961A] border border-[#C8961A]/30 font-extrabold' : 'text-slate-400 hover:text-white'}`}
              >
                All
              </button>
              <button 
                onClick={() => setMode('rent')}
                className={`px-3 py-1 rounded transition ${mode === 'rent' ? 'bg-[#C8961A]/20 text-[#C8961A] border border-[#C8961A]/30 font-extrabold' : 'text-slate-400 hover:text-white'}`}
              >
                Rent
              </button>
              <button 
                onClick={() => setMode('resale')}
                className={`px-3 py-1 rounded transition ${mode === 'resale' ? 'bg-[#C8961A]/20 text-[#C8961A] border border-[#C8961A]/30 font-extrabold' : 'text-slate-400 hover:text-white'}`}
              >
                Resale
              </button>
            </div>

            {/* Compounds Selector */}
            <div className="relative">
              <button 
                onClick={() => setOpen(ddOpen === 'cpd' ? null : 'cpd')}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-slate-400 hover:text-[#C8961A] cursor-pointer whitespace-nowrap"
              >
                ⊙ {selectedCompounds.length > 0 ? `${selectedCompounds.length} Compounds` : (isAr ? 'كل المجمعات' : 'All Compounds')} ▾
              </button>
              {ddOpen === 'cpd' && (
                <div className={`absolute top-full mt-2 left-0 w-64 rounded-xl border p-2 shadow-2xl z-50 ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <input 
                    type="text" 
                    placeholder="Search compound..." 
                    value={cmpQ}
                    onChange={(e) => setCmpQ(e.target.value)}
                    className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-800 text-white outline-none focus:border-[#C8961A]/60 mb-2 font-mono"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5 text-xs">
                    {ALL_COMPOUNDS.filter(c => !cmpQ || c.toLowerCase().includes(cmpQ.toLowerCase())).map(c => {
                      const isSel = selectedCompounds.includes(c);
                      return (
                        <button 
                          key={c}
                          onClick={() => setSelectedCompounds(prev => isSel ? prev.filter(x => x !== c) : [...prev, c])}
                          className="w-full text-left p-1.5 rounded flex items-center gap-2 hover:bg-[#C8961A]/10 text-slate-300 hover:text-white"
                        >
                          <span className={`w-3.5 h-3.5 border rounded flex items-center justify-center font-bold text-[9px] ${isSel ? 'bg-[#C8961A]/30 border-[#C8961A] text-[#C8961A]' : 'border-slate-800'}`}>
                            {isSel ? '✓' : ''}
                          </span>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bedrooms Dropdown */}
            <div className="relative border-l border-[#C8961A]/10 pl-2">
              <button 
                onClick={() => setOpen(ddOpen === 'rooms' ? null : 'rooms')}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-slate-400 hover:text-[#C8961A] cursor-pointer whitespace-nowrap"
              >
                ⊟ {bedrooms !== null ? `${bedrooms} Beds` : (isAr ? 'الغرف' : 'Rooms')} ▾
              </button>
              {ddOpen === 'rooms' && (
                <div className={`absolute top-full mt-2 left-0 w-36 rounded-xl border p-2 shadow-2xl z-50 ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <button 
                    onClick={() => { setRooms(null); setOpen(null); }}
                    className="w-full text-left p-2 rounded hover:bg-[#C8961A]/10 text-xs text-slate-300"
                  >
                    Any Bed count
                  </button>
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <button 
                      key={num}
                      onClick={() => { setRooms(num); setOpen(null); }}
                      className="w-full text-left p-2 rounded flex items-center gap-2 hover:bg-[#C8961A]/10 text-xs text-slate-300"
                    >
                      <span className={`w-3.5 h-3.5 border rounded flex items-center justify-center text-[9px] ${bedrooms === num ? 'bg-[#C8961A]/30 border-[#C8961A] text-[#C8961A]' : 'border-slate-800'}`}>
                        {bedrooms === num ? '✓' : ''}
                      </span>
                      {num} {num === 1 ? 'Bedroom' : 'Bedrooms'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nearby facilities filter */}
            <div className="relative border-l border-[#C8961A]/10 pl-2">
              <button 
                onClick={() => setOpen(ddOpen === 'near' ? null : 'near')}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-slate-400 hover:text-[#C8961A] cursor-pointer whitespace-nowrap"
              >
                ◎ {nearbyFilter || (isAr ? 'قريب من' : 'Nearby')} ▾
              </button>
              {ddOpen === 'near' && (
                <div className={`absolute top-full mt-2 right-0 w-56 rounded-xl border p-2 shadow-2xl z-50 max-h-56 overflow-y-auto ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <button 
                    onClick={() => { setNearbyFilter(null); setOpen(null); }}
                    className="w-full text-left p-2 rounded hover:bg-[#C8961A]/10 text-xs text-slate-300"
                  >
                    Clear facility filter
                  </button>
                  {NEARBY.map(place => (
                    <button 
                      key={place}
                      onClick={() => { setNearbyFilter(place); setOpen(null); }}
                      className="w-full text-left p-2 rounded hover:bg-[#C8961A]/10 text-xs text-slate-300 truncate"
                      title={place}
                    >
                      {place}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => { setSmartOpen(prev => !prev); setSmartSubmitted(false); }}
              className="py-1 px-4 ml-3 rounded-full text-[10px] font-extrabold uppercase text-[#07111E] tracking-wider select-none transform hover:scale-103 active:scale-95 transition bg-gradient-to-r from-[#gold] to-[#gold-lt] bg-[#C8961A]"
            >
              Search · {filteredListings.length}
            </button>
          </div>
        </div>

        {/* Header Right togglers */}
        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className={`w-[32px] h-[32px] rounded-full flex items-center justify-center border text-xs cursor-pointer active:scale-95 transition ${
              theme === 'light' ? 'border-[#C8961A]/20 bg-white text-slate-700 hover:text-[#C8961A]' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-[#C8961A]'
            }`}
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button 
            onClick={onEnterAdminSession}
            className={`w-[32px] h-[32px] rounded-full flex items-center justify-center border text-xs cursor-pointer active:scale-95 transition ${
              theme === 'light' ? 'border-[#C8961A]/20 bg-slate-100/40 text-slate-700' : 'border-slate-800 bg-slate-950/40 text-slate-400'
            } hover:text-[#C8961A] hover:border-[#C8961A]/30`}
            title="Access Admin Console"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Smart Search WhatsApp Request sliding helper */}
      {smartOpen && (
        <div className={`mt-[56px] border-b py-5 px-6 shadow-xl transition-all duration-300 ${
          theme === 'light' ? 'bg-[#FFFDF9] border-[#C8961A]/10' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-end justify-between relative">
            <button 
              onClick={() => setSmartOpen(false)}
              className="absolute -top-3 -right-2 p-1.5 text-slate-500 hover:text-[#C8961A] text-lg font-bold"
            >
              ×
            </button>
            {smartSubmitted ? (
              <div className="w-full flex items-center gap-3 text-[#10b981] justify-center py-2 animate-fade-in">
                <span className="text-xl">✓</span>
                <div>
                  <div className="text-sm font-semibold">Your property search request has been submitted!</div>
                  <div className="text-[10px] text-slate-400">Our concierge team will populate custom lists matching your exact criteria to WhatsApp.</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 w-full text-left">
                  <label className="block text-[8px] font-mono tracking-widest font-extrabold uppercase text-[#C8961A] mb-1">WhatsApp Mobile Contact</label>
                  <input 
                    type="text" 
                    placeholder="+20 10x xxxx xxxx" 
                    value={smartWa}
                    onChange={(e) => setSmartWa(e.target.value)}
                    className="w-full text-xs p-2.5 rounded bg-slate-900 border border-slate-800 text-white outline-none focus:border-[#C8961A]/50 font-mono"
                  />
                </div>
                <div className="flex-1 w-full text-left">
                  <label className="block text-[8px] font-mono tracking-widest font-extrabold uppercase text-[#C8961A] mb-1">Full Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Enter name" 
                    value={smartName}
                    onChange={(e) => setSmartName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded bg-slate-900 border border-slate-800 text-white outline-none focus:border-[#C8961A]/50 font-mono"
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!smartWa.trim()) return;
                    const briefText = `Matched client search filtering: ${selectedCompounds.join(', ')} Compound, Bedrooms: ${bedrooms || 'Any'}`;
                    const succ = await handleLeadSubmit(smartName, smartWa, 'Dynamic Matcher', 'Any Budget', briefText);
                    if (succ) {
                      setSmartSubmitted(true);
                      setTimeout(() => setSmartOpen(false), 2200);
                    }
                  }}
                  disabled={!smartWa.trim()}
                  className="w-full md:w-auto py-2.5 px-6 font-bold text-xs uppercase bg-[#C8961A] text-black shadow-lg rounded hover:bg-[#E9C176]"
                >
                  Deliver {filteredListings.length} Matches via WhatsApp →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LUXURY PARALLAX HERO STAGE ────────────────────────────────────── */}
      <section className="relative h-[100svh] min-h-[600px] overflow-hidden select-none bg-[#030810]">
        {/* Parallax Panoramic Backdrop */}
        <div 
          ref={heroBackgroundRef}
          className="absolute inset-[-10%] w-[120%] h-[120%] bg-cover bg-center transition-all duration-700 ease-out" 
          style={{ 
            backgroundImage: `url(${SCENES[heroScene].bg})`,
            transform: 'scale(1.0)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a121e]/20 via-[#07111E]/45 to-[#07111E] z-10" />

        {/* Drift Particle Canvas */}
        <canvas ref={heroParticlesRef} className="absolute inset-0 pointer-events-none z-20" />

        {/* Foreground copy block */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-28 text-center px-6 z-30 space-y-4">
          <span className="font-mono text-[9px] font-extrabold text-[#E9C176] uppercase tracking-[0.35em] animate-fade-in">
            {isAr ? 'ذكاء اصطناعي · القاهرة الجديدة' : 'Artificial Intelligence · New Cairo'}
          </span>
          <h1 className="font-serif text-5xl md:text-7xl font-light text-white leading-[1.05] tracking-tight max-w-4xl animate-fade-in-up">
            {isAr ? (
              <>اعثر على <em className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#C8961A] to-[#E9C176]">بيتك المثالي</em><br/>مدعوم بنماذج الذكاء 3.0</>
            ) : (
              <>Find Your <em className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#C8961A] to-[#E9C176]">Dream Home</em><br/>Driven by Sierra AI 3.0</>
            )}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium tracking-wide max-w-lg select-none">
            {isAr ? '١٩ مجمعاً فاخراً بالقاهرة الجديدة · مطابقة واحتساب لعوائد الاستثمار فورياً' : '19 premium compounds matching New Cairo luxury Briefs. Full instant ROI tracking.'}
          </p>

          {/* Quick Stats banner */}
          <div className="grid grid-cols-4 gap-6 bg-slate-950/60 p-4 border border-slate-800/80 max-w-lg w-full rounded-2xl shadow-2xl backdrop-blur-md select-none mt-4 border-t-[#C8961A]/40">
            {[
              { val: '26', label: 'Listings' },
              { val: '19', label: 'Compounds' },
              { val: '9.8', label: 'AI Score' },
              { val: 'Instant', label: 'Response' },
            ].map((st, idx) => (
              <div key={idx} className="text-center font-mono">
                <div className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#E9C176] to-[#C8961A] leading-none mb-1">
                  {st.val}
                </div>
                <div className="text-[7.5px] uppercase tracking-wider text-slate-500 font-extrabold">{st.label}</div>
              </div>
            ))}
          </div>

          {/* Controls Dots indicator Slider */}
          <div className="flex gap-2.5 pt-4">
            {SCENES.map((sc, i) => (
              <button 
                key={i}
                type="button"
                onClick={() => setHeroScene(i)}
                className={`w-12 h-8 rounded-lg overflow-hidden border transition active:scale-95 ${heroScene === i ? 'border-[#C8961A] shadow-md ring-2 ring-[#C8961A]/20' : 'border-slate-800'}`}
              >
                <img src={sc.thumb} alt={sc.lbl} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── LISTINGS HUB STAGE ────────────────────────────────────────────── */}
      <section className={`py-20 px-4 md:px-8 border-t border-slate-900 ${theme === 'light' ? 'bg-[#FAFAF7]' : 'bg-[#0f1b2c]/20'}`} id="listings">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="font-mono text-[9px] font-extrabold uppercase tracking-[0.3em] text-[#C8961A]">
              {isAr ? 'المخزون المنسق' : 'Live Curated Inventory'}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light text-white">
              {isAr ? 'عقارات متاحة ومحدثة' : `${filteredListings.length} Premium Units Available`}
            </h2>
          </div>

          {/* Listings secondary sort bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black select-none">Sort listings:</span>
              <select 
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs py-1.5 px-3 rounded-lg outline-none cursor-pointer focus:border-[#C8961A]/50 font-mono"
              >
                <option value="ai">Sierra AI Recommendation ↓</option>
                <option value="pd">Price (High to Low)</option>
                <option value="pa">Price (Low to High)</option>
                <option value="area">Area Size (Largest)</option>
              </select>
            </div>
            <span className="text-[10px] font-mono text-[#C8961A] uppercase tracking-wider select-none font-bold">
              LISTING CRITERIA MATCHES REAL-TIME DATABASE
            </span>
          </div>

          {/* Listings Grid */}
          {loadingListings ? (
            <div className="text-center py-20 font-mono text-xs text-slate-500 uppercase select-none animate-pulse">
              SYNCING INVENTORY WITH FIRESTORE DIRECTORY...
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              Currently no direct matches indexed. Please query compound search filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredListings.map((l) => {
                const imgIdx = (l.img !== undefined && l.img < HUB_IMGS.length) ? l.img : 0;
                return (
                  <div 
                    key={l.id} 
                    className={`group border overflow-hidden rounded-2xl shadow-lg transition-all duration-300 relative select-none ${
                      theme === 'light' ? 'bg-white border-[#C8961A]/10 hover:border-[#C8961A]/40' : 'bg-slate-950 border-slate-900 hover:border-[#C8961A]/30'
                    }`}
                    style={{ transformOrigin: 'center' }}
                  >
                    {/* Media viewport */}
                    <div className="relative h-[180px] overflow-hidden bg-slate-900 select-none">
                      <img 
                        src={HUB_IMGS[imgIdx]} 
                        alt={l.code} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-3 right-3 py-1 px-2 text-[8px] font-mono font-black uppercase rounded bg-slate-950/90 border border-[#C8961A]/50 text-[#C8961A] select-none tracking-widest leading-none">
                        ▲ AI {l.ai}
                      </span>
                    </div>

                    {/* Meta info details */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[7px] font-extrabold text-[#C8961A] uppercase tracking-widest">{l.cmp}</span>
                        <span className="font-mono text-[8px] font-semibold text-slate-500 truncate">{l.code}</span>
                      </div>
                      <h3 className="font-serif text-base font-semibold truncate text-white">{l.beds}-Bed {l.type}</h3>
                      
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-900/60 font-mono text-center select-none text-[10px]">
                        <div className="py-1 rounded bg-slate-900/40">
                          <span className="font-bold text-white block leading-none mb-1">{l.beds}</span>
                          <span className="text-[7px] text-slate-500 uppercase tracking-wider font-extrabold select-none">Beds</span>
                        </div>
                        <div className="py-1 rounded bg-slate-900/40">
                          <span className="font-bold text-white block leading-none mb-1">{l.area}</span>
                          <span className="text-[7px] text-slate-500 uppercase tracking-wider font-extrabold select-none">m²</span>
                        </div>
                        <div className="py-1 rounded bg-slate-900/40 truncate">
                          <span className="font-bold text-white block leading-none mb-1 truncate">{l.type.substring(0, 4)}</span>
                          <span className="text-[7px] text-slate-500 uppercase tracking-wider font-extrabold select-none">Type</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="font-mono text-xs font-black text-[#C8961A]">{l.price}</span>
                        <button 
                          onClick={() => {
                            setQrCpd(l.cmp);
                            setQrReqs(`Interested in unit: ${l.code} (${l.beds} bed ${l.type}).`);
                            const element = document.getElementById('contact');
                            if (element) element.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-[9px] uppercase font-bold text-[#C8961A] select-none text-right hover:underline"
                        >
                          Send Request →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── COHESIVE 3D VIRTUAL TOUR PANORAMAS V2.0 ────────────────────── */}
      <section className="bg-slate-950 py-20 px-4 md:px-8 border-t border-slate-900" id="tour-360">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <span className="font-mono text-[9px] font-extrabold text-[#C8961A] uppercase tracking-[0.3em]">
              {isAr ? 'الجولة الافتراضية' : 'PANORAMIC STAGE'}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light text-white leading-tight">
              {isAr ? 'استعرض الغرف كاملة' : '360° Sphere virtual tour'}
            </h2>
            <p className="text-xs text-slate-550 leading-relaxed">
              Drag on the viewport in any direction to explore the property structure in full 360° virtual space. Zoom in/out to inspect finer details.
            </p>
          </div>

          <div className="relative h-[65vh] min-h-[480px] bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            {/* Sphere container target */}
            <div ref={tourContainerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

            {tourLoading && (
              <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center font-mono select-none">
                <div className="w-8 h-8 rounded-full border border-[#C8961A]/20 border-t-[#C8961A] animate-spin mb-3" />
                <span className="text-[10px] tracking-widest text-[#E9C176]/70 uppercase animate-pulse">RENDERING PANORAMIC WEBGL FIELD...</span>
              </div>
            )}

            {/* Float badge title indicator */}
            <div className="absolute top-4 left-4 bg-slate-950/95 border border-[#C8961A]/30 p-3.5 rounded-xl z-20 shadow-2xl backdrop-blur select-none">
              <div className="font-serif text-lg md:text-xl text-white font-medium">{TOUR_ROOMS[tourRoom].name}</div>
              <div className="font-mono text-[7.5px] uppercase tracking-widest text-[#C8961A] mt-1">SIERRA PANORAMIC 3D ROOM {tourRoom + 1} / {TOUR_ROOMS.length}</div>
            </div>

            {tourHint && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950/80 border border-slate-800 text-slate-400 select-none px-4 py-2 text-[10.5px] rounded-full backdrop-blur pointer-events-none tracking-wide">
                Drag mouse in any direction to spin camera Look
              </div>
            )}

            {/* Auxiliary control pads */}
            <div className="absolute top-4 right-4 flex gap-1.5 z-20">
              <button 
                onClick={() => {
                  const el = tourContainerRef.current;
                  if (el && (el as any).__zoom) (el as any).__zoom(-8);
                }}
                className="w-[36px] h-[36px] bg-slate-950/90 border border-slate-800 rounded-lg text-white hover:text-[#C8961A] shadow cursor-pointer text-xs font-bold transition select-none flex items-center justify-center"
                title="Zoom In"
              >
                ＋
              </button>
              <button 
                onClick={() => {
                  const el = tourContainerRef.current;
                  if (el && (el as any).__zoom) (el as any).__zoom(8);
                }}
                className="w-[36px] h-[36px] bg-slate-950/90 border border-slate-800 rounded-lg text-white hover:text-[#C8961A] shadow cursor-pointer text-xs font-bold transition select-none flex items-center justify-center"
                title="Zoom Out"
              >
                －
              </button>
              <button 
                onClick={() => {
                  const el = tourContainerRef.current;
                  if (el && (el as any).__reset) (el as any).__reset();
                }}
                className="w-[36px] h-[36px] bg-slate-950/90 border border-slate-800 rounded-lg text-white hover:text-[#C8961A] shadow cursor-pointer text-xs font-bold transition select-none flex items-center justify-center"
                title="Reset Look"
              >
                ↺
              </button>
            </div>

            {/* D-Pad on viewport margin */}
            <div className="absolute right-4 bottom-4 grid grid-cols-3 grid-rows-3 gap-1 z-20">
              <div />
              <button 
                onClick={() => {
                  const el = tourContainerRef.current;
                  if (el && (el as any).__pan) (el as any).__pan(0, -18);
                }}
                className="w-8 h-8 rounded border border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white flex items-center justify-center text-xs select-none cursor-pointer"
              >
                ↑
              </button>
              <div />

              <button 
                onClick={() => {
                  const el = tourContainerRef.current;
                  if (el && (el as any).__pan) (el as any).__pan(-22, 0);
                }}
                className="w-8 h-8 rounded border border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white flex items-center justify-center text-xs select-none cursor-pointer"
              >
                ←
              </button>
              <div className="w-8 h-8 rounded bg-[#C8961A]/10 border border-[#C8961A]/20" />
              <button 
                onClick={() => {
                  const el = tourContainerRef.current;
                  if (el && (el as any).__pan) (el as any).__pan(22, 0);
                }}
                className="w-8 h-8 rounded border border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white flex items-center justify-center text-xs select-none cursor-pointer"
              >
                →
              </button>

              <div />
              <button 
                onClick={() => {
                  const el = tourContainerRef.current;
                  if (el && (el as any).__pan) (el as any).__pan(0, 18);
                }}
                className="w-8 h-8 rounded border border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white flex items-center justify-center text-xs select-none cursor-pointer"
              >
                ↓
              </button>
              <div />
            </div>
          </div>

          {/* Panoramic pills navigations */}
          <div className="flex gap-2.5 pb-2 overflow-x-auto justify-center select-none scrollbar">
            {TOUR_ROOMS.map((rm, i) => (
              <button 
                key={i}
                onClick={() => setTourRoom(i)}
                className={`py-2 px-5 rounded-full border text-[11px] font-bold whitespace-nowrap cursor-pointer transition select-none tracking-wide text-xs ${
                  tourRoom === i ? 'bg-[#C8961A]/20 border-[#C8961A] text-[#E9C176]' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {rm.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLIENT HUD INTERACTIVE MAP SECTION ───────────────────────────────── */}
      <section className="bg-slate-950 py-20 px-4 md:px-8 border-t border-slate-900" id="smart-map">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-1">
            <span className="font-mono text-[9px] font-extrabold text-[#C8961A] tracking-[0.25em] uppercase">
              {isAr ? 'الخريطة التفاعلية للقاهرة الجديدة' : 'SMART MAP MODULE'}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light text-white leading-tight">
              {isAr ? 'خريطة مجمعات القاهرة الجديدة' : 'New Cairo Luxury Compound Locator'}
            </h2>
            <p className="text-xs text-slate-400">
              Interactive geographic map plotted with live real-property listing tallies. Review geographical clusters on the fly.
            </p>
          </div>

          <div className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-4 max-h-[580px] h-[550px]" id="spatial-locator">
            {/* Map sidebar - left column */}
            <div className="hidden lg:flex flex-col bg-slate-950 border-r border-slate-900 max-h-full">
              <div className="p-4 border-b border-slate-900/80 shrink-0">
                <span className="font-mono text-[8.5px] font-bold tracking-[0.16em] uppercase text-[#C8961A]">ACTIVE SELECTIONS</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Transaction mode filter inside map lists */}
                <div className="space-y-1.5">
                  <div className="font-mono text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Deal Class</div>
                  <div className="flex bg-[#05080f] p-[2px] rounded border border-slate-900 text-[10px] font-mono font-bold w-full">
                    <button 
                      onClick={() => setMode('all')}
                      className={`flex-1 py-1 px-2 rounded text-center transition ${mode === 'all' ? 'bg-[#C8961A]/20 text-[#C8961A] border border-[#C8961A]/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setMode('rent')}
                      className={`flex-1 py-1 px-2 rounded text-center transition ${mode === 'rent' ? 'bg-[#C8961A]/20 text-[#C8961A] border border-[#C8961A]/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      Rent
                    </button>
                    <button 
                      onClick={() => setMode('resale')}
                      className={`flex-1 py-1 px-2 rounded text-center transition ${mode === 'resale' ? 'bg-[#C8961A]/20 text-[#C8961A] border border-[#C8961A]/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      Sales
                    </button>
                  </div>
                </div>

                {/* Direct quick matching facility presets */}
                <div className="space-y-1.5">
                  <div className="font-mono text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Nearby Centers</div>
                  <div className="flex flex-wrap gap-1 leading-normal pt-1">
                    {NEARBY.slice(0, 5).map(nb => {
                      const isMatch = nearbyFilter === nb;
                      return (
                        <button 
                          key={nb}
                          onClick={() => setNearbyFilter(isMatch ? null : nb)}
                          className={`py-1 px-2 border rounded-full text-[9px] hover:border-[#C8961A]/40 font-mono tracking-wide ${isMatch ? 'bg-[#C8961A]/20 border-[#C8961A] text-[#C8961A] font-extrabold' : 'border-slate-800/80 bg-slate-900/30 text-slate-400'}`}
                        >
                          {nb.replace(' New Cairo', '').replace(' Cairo', '').substring(0, 16)}...
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Geographical leaflet map target canvas */}
            <div className="lg:col-span-2 relative max-h-full">
              <div id={mapIdRef.current} className="w-full h-full absolute inset-0 z-10" />
            </div>

            {/* Compounds details - right column list */}
            <div className="hidden lg:flex flex-col bg-slate-950 border-l border-slate-900 max-h-full">
              <div className="p-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between shrink-0 select-none">
                <span className="font-mono text-[8.5px] font-extrabold tracking-widest uppercase text-[#C8961A]">ACTIVE REGISTRY</span>
                <span className="font-mono text-[9px] text-slate-500 font-bold">{MAP_COMPOUNDS.length} Plotted</span>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60 scrollbar leading-normal">
                {MAP_COMPOUNDS.map((c, i) => {
                  const liveCount = listings.filter(l => l.cmp === c.name).length;
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelCpd({
                        name: c.name,
                        units: liveCount > 0 ? liveCount : 5,
                        zone: c.zone,
                        aiScore: c.ai,
                        priceResale: c.priceResale,
                        priceRent: c.priceRent
                      })}
                      className="p-3.5 hover:bg-slate-900/40 transition cursor-pointer text-left"
                    >
                      <div className="flex justify-between items-start mb-1 leading-none">
                        <span className="text-xs font-bold text-slate-100">{c.name}</span>
                        <span className="font-mono text-[9.5px] font-extrabold text-[#C8961A]">AI {c.ai}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{mode === 'rent' ? c.priceRent : c.priceResale}</div>
                      <div className="flex justify-between items-center text-[8.5px] text-slate-500 font-mono mt-2 uppercase font-black tracking-widest">
                        <span>{liveCount > 0 ? `${liveCount} direct units` : 'Dossiers Available'}</span>
                        <span>{c.zone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE CHAT CONCIERGE FAB OVERLAY ────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[1000] select-none">
        {chatOpen && (
          <div className={`absolute bottom-[72px] right-0 w-[350px] md:w-[380px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-slide-up duration-300 ${
            theme === 'light' ? 'bg-white border-amber-500/10' : 'bg-slate-950 border-slate-800/80 shadow-[#03060f]/60'
          }`}>
            {/* Header chat tab */}
            <div className="bg-[#0D2035] p-4 flex items-center gap-3 shrink-0 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              <div className="text-left leading-normal">
                <div className="text-xs font-bold text-white leading-none">Sierra Estates AI</div>
                <div className="text-[7.5px] uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#E9C176] font-mono mt-1 font-black">NEW CAIRO CONCIERGE</div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="ml-auto p-1 text-slate-500 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Messages box viewport */}
            <div className="h-[260px] overflow-y-auto p-4 space-y-2.5 overflow-x-hidden text-xs">
              {chatMsgs.map((m) => {
                const isAi = m.sender === 'ai';
                return (
                  <div key={m.id} className={`flex max-w-[85%] ${isAi ? 'self-start mr-auto' : 'ml-auto text-right'}`}>
                    <div className={`p-3 rounded-2xl shadow leading-relaxed text-xs text-left ${
                      isAi 
                        ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm' 
                        : 'bg-gradient-to-r from-[#gold] to-[#gold-lt] bg-[#C8961A] text-black font-semibold rounded-tr-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {chatTyping && (
                <div className="flex gap-1.5 p-2 self-start">
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={i} 
                      className="w-1.5 h-1.5 rounded-full bg-[#C8961A] animate-bounce" 
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Quick action query chips */}
            <div className="flex gap-1.5 px-4 pb-3 flex-wrap leading-none select-none shrink-0 border-t border-slate-800/10 pt-2 bg-slate-900/10">
              {['Hyde Park ROI', 'Mivida units', 'Best ROI matches', 'Invest 5M'].map((ch) => (
                <button 
                  key={ch}
                  onClick={() => sendChatMessage(ch)}
                  className="py-1 px-2.5 rounded-full border border-[#C8961A]/20 bg-[#C8961A]/5 text-[#E9C176] text-[9.5px] cursor-pointer hover:bg-[#C8961A]/13 transition font-mono whitespace-nowrap active:scale-95"
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* Input typing panel */}
            <div className="flex gap-2 p-3 border-t border-slate-800/60 shrink-0 select-none bg-slate-950">
              <input 
                type="text" 
                placeholder="Ask Sierra e.g., 'Uptown Cairo pricing'..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(chatInput)}
                className="flex-1 text-xs bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#C8961A]/50 font-mono"
              />
              <button 
                onClick={() => sendChatMessage(chatInput)}
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm bg-[#C8961A] hover:bg-[#E9C176] text-black active:scale-90 transition disabled:opacity-40 select-none disabled:scale-100 cursor-pointer"
              >
                ↗
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => setChatOpen(prev => !prev)}
          className="w-14 h-14 bg-[#C8961A] hover:bg-[#E9C176] rounded-full shadow-[0_0_20px_rgba(200,150,26,0.35)] flex items-center justify-center text-xl text-black hover:scale-105 active:scale-95 transform transition cursor-pointer select-none"
        >
          {chatOpen ? '×' : '⟡'}
        </button>
      </div>

      {/* ── CLIENT HUD QUICK CONTACT REQUEST FORM ────────────────────────────── */}
      <section className={`py-20 px-4 md:px-8 border-t border-slate-900 select-none ${theme === 'light' ? 'bg-[#FAFAF7]' : 'bg-[#0a121e]/50'}`} id="contact">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="font-mono text-[9px] font-extrabold text-[#C8961A] tracking-[0.3em] uppercase">GET IN TOUCH</span>
            <h2 className="font-serif text-3xl md:text-5xl font-light text-white leading-tight">Request matched list catalogs</h2>
            <p className="text-xs text-slate-400">
              Sierra Intelligence concierge processes listing dossiers matching your budget exactly to WhatsApp.
            </p>
          </div>

          <div className={`p-8 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden text-left ${
            theme === 'light' ? 'bg-white border-[#C8961A]/10 shadow-[0_4px_30px_rgba(10,26,43,0.06)]' : 'bg-slate-950 border-slate-900'
          }`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C8961A] to-[#E9C176]" />
            
            {qrSubmitted ? (
              <div className="py-16 text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full border border-green-500/20 bg-green-500/10 text-green-400 text-3xl font-bold flex items-center justify-center mx-auto">✓</div>
                <h3 className="font-serif text-2xl font-light text-white">We've received your request!</h3>
                <p className="text-[#C8961A] font-mono text-xs font-extrabold uppercase select-none">DELIVERING BEST AIMATCH SAMPLES TO WHATSAPP WITHIN 24h</p>
                <button 
                  onClick={() => setQrSubmitted(false)}
                  className="py-1 px-4 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Send another request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[8.5px] font-mono font-black tracking-widest text-[#C8961A] uppercase leading-none">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="Ahmed Al-Fawzy" 
                      value={qrName}
                      onChange={(e) => setQrName(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white outline-none focus:border-[#C8961A]/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8.5px] font-mono font-black tracking-widest text-[#C8961A] uppercase leading-none">WhatsApp Mobile Number</label>
                    <input 
                      type="text" 
                      placeholder="+20 100 111 2233" 
                      value={qrWa}
                      onChange={(e) => setQrWa(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white outline-none focus:border-[#C8961A]/50 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[8.5px] font-mono font-black tracking-widest text-[#C8961A] uppercase leading-none">Target Compound</label>
                    <select 
                      value={qrCpd}
                      onChange={(e) => setQrCpd(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 outline-none cursor-pointer focus:border-[#C8961A]/50"
                    >
                      <option value="Any">All New Cairo Compounds</option>
                      {ALL_COMPOUNDS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8.5px] font-mono font-black tracking-widest text-[#C8961A] uppercase leading-none">Estimated Budget limit</label>
                    <select 
                      value={qrBudget}
                      onChange={(e) => setQrBudget(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 outline-none cursor-pointer focus:border-[#C8961A]/50"
                    >
                      {['Any Budget', 'Under EGP 5M', 'EGP 5M – 10M', 'EGP 10M – 20M', 'EGP 20M+', 'Under $2K/mo', '$2K - $5K/mo', '$5K+/mo'].map(bud => (
                        <option key={bud} value={bud}>{bud}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8.5px] font-mono font-black tracking-widest text-[#C8961A] uppercase leading-none">Specific requirements (Pool, Garden, Floor level, etc.)</label>
                  <textarea 
                    placeholder="Enter notes..." 
                    value={qrReqs}
                    onChange={(e) => setQrReqs(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white outline-none focus:border-[#C8961A]/50 min-h-[90px] resize-y"
                  />
                </div>

                <button 
                  onClick={async () => {
                    const succ = await handleLeadSubmit(qrName, qrWa, qrCpd, qrBudget, qrReqs);
                    if (succ) {
                      setQrSubmitted(true);
                      setQrName('');
                      setQrWa('');
                      setQrReqs('');
                    }
                  }}
                  disabled={!qrWa.trim()}
                  className="py-3 px-8 font-bold text-xs uppercase bg-[#C8961A] hover:bg-[#E9C176] text-black shadow-lg rounded-lg select-none transform hover:-translate-y-0.5 transition active:scale-95 duration-100 disabled:opacity-40 disabled:scale-100 cursor-pointer"
                >
                  Send matched request →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER BAR ────────────────────────────────────────────────────── */}
      <footer className="footer bg-slate-950 border-t border-slate-900/60 p-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-left select-none">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="assets/logo-gold.png" alt="Sierra Estates logo" className="w-[28px] h-[28px] object-contain multiply-blend" />
              <div className="text-left font-serif text-sm font-semibold tracking-wider text-slate-200 uppercase">SIERRA ESTATES</div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Artificial Intelligence real-property locator specializing in New Cairo's 19 luxury compounds, fully streamlined with custom ROI matrices.
            </p>
          </div>

          {[
            { title: 'PROPERTIES', links: ['Grand Villas', 'Luxury Apartments', 'Twin Houses', 'Sky Penthouses', 'Duplex Suites'] },
            { title: 'COMPOUNDS', links: ['Hyde Park', 'Mountain View iCity', 'Mivida', 'Al Rehab', 'Browse all 19 Compounds →'] },
            { title: 'AI OPERATIONS', links: ['Chat AI Advisor', 'Leads Registration', 'Scribe Ingestion Parser', 'AVM Price Curator', 'Secure Admin Login (⚙)'] },
          ].map((col, i) => (
            <div key={i} className="space-y-3 font-mono">
              <div className="text-[8px] font-black text-slate-400 tracking-[0.2em]">{col.title}</div>
              <ul className="space-y-1.5 text-[10.5px]">
                {col.links.map(lk => (
                  <li key={lk}>
                    <a href="#" className="hover:text-[#C8961A] transition">{lk}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex justify-between items-center flex-wrap gap-4 select-none">
          <span className="font-mono text-[9px] tracking-wider uppercase text-slate-600 font-bold">
            © 2026 SIERRA ESTATES · INTELLIGENCE OS 3.0 · MULTI-YIELD MODEL
          </span>
          <button 
            onClick={onEnterAdminSession}
            className="font-mono hover:text-[#C8961A] text-[10px] tracking-wider transition underline font-black cursor-pointer uppercase select-none"
          >
            ⚙️ Access Admin Portal 3.0
          </button>
        </div>
      </footer>

      {/* ── COMPOUND DISCOVERY PROFILE MODAL ─────────────────────────────── */}
      {selCpd && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setSelCpd(null)}>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[82vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            {/* Header discovery info */}
            <div className="p-6 border-b border-slate-950 bg-slate-900/10 flex justify-between items-start shrink-0">
              <div className="text-left">
                <h3 className="font-serif text-2xl text-white font-medium">{selCpd.name}</h3>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1 uppercase font-bold">{selCpd.zone} · NEW CAIRO PRESTIGE ZONE</p>
              </div>
              <button 
                onClick={() => setSelCpd(null)}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white-400 cursor-pointer font-bold select-none transition"
              >
                ✕
              </button>
            </div>

            {/* Quick KPIs stats */}
            <div className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-slate-900 bg-slate-900/20 shrink-0 font-mono text-center select-none text-[11px]">
              {[
                { l: 'Resale Avg Price', v: selCpd.priceResale, c: 'text-[#C8961A]' },
                { l: 'Rental Range', v: selCpd.priceRent, c: 'text-cyan-400' },
                { l: 'Compounds Plotted', v: `${selCpd.units} Units`, c: 'text-white' },
                { l: 'Sierra score', v: `${selCpd.aiScore}/10`, c: 'text-[#10b981]' },
              ].map((kp, idx) => (
                <div key={idx} className="p-2.5 rounded-xl border border-slate-900 bg-slate-950/40">
                  <div className={`font-black tracking-tight mb-0.5 ${kp.c}`}>{kp.v}</div>
                  <div className="text-[7.5px] text-slate-400 uppercase tracking-wider font-extrabold select-none truncate" title={kp.l}>{kp.l}</div>
                </div>
              ))}
            </div>

            {/* Matching Live Units List */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar">
              <div className="text-[9px] font-mono text-[#C8961A] uppercase tracking-widest font-black select-none mb-3">Live listings registered in {selCpd.name}:</div>
              
              {listings.filter((l) => l.cmp === selCpd.name).length === 0 ? (
                <div className="py-14 text-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-500 font-mono text-xs select-none">No active inventory documents listed currently.</p>
                  <p className="text-[10px] text-[#C8961A]/70 uppercase tracking-widest font-bold mt-1.5 cursor-pointer hover:underline" onClick={() => { setSelCpd(null); setQrCpd(selCpd.name); const el = document.getElementById('contact'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}>Request Broker Catalog dossier →</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.filter((l) => l.cmp === selCpd.name).map((u) => {
                    const imgIdx = (u.img !== undefined && u.img < HUB_IMGS.length) ? u.img : 0;
                    return (
                      <div key={u.id} className="p-3 bg-[#0a0f1d] border border-slate-900 hover:border-[#C8961A]/20 transition rounded-xl flex gap-3 h-20 items-center">
                        <img src={HUB_IMGS[imgIdx]} alt="" className="w-20 h-full rounded-lg object-cover bg-slate-950/80 shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="text-xs font-bold text-white leading-tight truncate">{u.beds}-Bed {u.type}</h4>
                          <span className="font-mono text-[9px] text-slate-400 mt-1 block">{u.area}m² · Code {u.code}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-black text-[#C8961A] block">{u.price}</span>
                          <span className="font-mono text-[8px] text-[#10b981] font-bold block mt-1 uppercase">AI RECOMMEND {u.ai}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer action trigger */}
            <div className="p-4 border-t border-slate-900 bg-slate-950 shrink-0 flex gap-3">
              <button 
                onClick={() => {
                  setSelCpd(null); 
                  setQrCpd(selCpd.name); 
                  setQrReqs(`Match requested for compound: ${selCpd.name}`);
                  const el = document.getElementById('contact'); 
                  if (el) el.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="flex-1 py-2.5 px-6 font-bold text-xs uppercase bg-[#C8961A] hover:bg-[#E9C176] text-black shadow-lg rounded-xl transition duration-150 animate-pulse font-mono tracking-wider cursor-pointer"
              >
                REQUEST DIRECT WhatsApp Catalog (EGP/USD) →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
