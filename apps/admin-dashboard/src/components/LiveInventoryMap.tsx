import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';

// ─── GEOGRAPHIC ZONES (fallback — overridden by Firestore `zones` collection) ──
const DEFAULT_ZONES = [
  {
    id: 'new_cairo',
    nameAr: 'القاهرة الجديدة',
    nameEn: 'New Cairo',
    coords: [30.0131, 31.5020] as [number, number],
    radius: 8000,
    color: '#C9A84C',
    compounds: [
      { name: 'Mivida', availability: 14, yield: '7.2%' },
      { name: 'Mountain View iCity', availability: 22, yield: '6.8%' },
      { name: 'Hyde Park', availability: 18, yield: '6.5%' },
      { name: 'Katameya Heights', availability: 5, yield: '8.1%' },
      { name: 'Palm Hills New Cairo', availability: 12, yield: '6.9%' },
    ],
  },
  {
    id: 'admin_capital',
    nameAr: 'العاصمة الإدارية',
    nameEn: 'New Admin Capital',
    coords: [30.0330, 31.7300] as [number, number],
    radius: 10000,
    color: '#8B7355',
    compounds: [
      { name: 'The Iconic Tower Area', availability: 30, yield: '9.0%' },
      { name: 'R7 District', availability: 45, yield: '7.5%' },
      { name: 'R8 District', availability: 38, yield: '7.2%' },
      { name: 'Green River', availability: 15, yield: '8.5%' },
    ],
  },
  {
    id: 'shorouk',
    nameAr: 'الشروق',
    nameEn: 'El Shorouk',
    coords: [30.1400, 31.6100] as [number, number],
    radius: 6000,
    color: '#B8960C',
    compounds: [
      { name: 'Sodic East', availability: 20, yield: '6.2%' },
      { name: 'Al Shorouk City', availability: 14, yield: '5.8%' },
    ],
  },
  {
    id: 'madinaty',
    nameAr: 'مدينتي',
    nameEn: 'Madinaty',
    coords: [30.1250, 31.6450] as [number, number],
    radius: 5000,
    color: '#D4AF37',
    compounds: [
      { name: 'Four Seasons Private Residences', availability: 3, yield: '8.8%' },
      { name: 'VGK Phase 1', availability: 12, yield: '6.5%' },
    ],
  },
];

type Zone = typeof DEFAULT_ZONES[0];

const MAP_CENTER: [number, number] = [30.0600, 31.6000];

// ─── APPLE STYLE MARKER ───────────────────────────────────────────────────────
const createAppleMarker = (count: number, active: boolean, isLight: boolean) => L.divIcon({
  className: '',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      transform: scale(${active ? 1.2 : 1});
      z-index: ${active ? 1000 : 1};
    ">
      <div style="
        background: ${active ? '#C9A84C' : (isLight ? '#fff' : '#0A1628')};
        color: ${active ? '#fff' : (isLight ? '#0A1628' : '#C9A84C')};
        padding: 6px 14px;
        border-radius: 20px;
        font-weight: 800;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15), 0 0 ${active ? '20px' : '0px'} rgba(201,168,76,0.4);
        border: 2px solid ${active ? '#fff' : '#C9A84C'};
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="font-family: inherit;">${count}</span>
        <span style="font-size: 9px; opacity: 0.7; text-transform: uppercase;">Units</span>
      </div>
      <div style="
        width: 0; 
        height: 0; 
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${active ? '#fff' : '#C9A84C'};
        margin-top: -2px;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
      "></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Component to handle map interactions
function RecenterMap({ coords, zoom }: { coords: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom, { animate: true, duration: 1 });
  }, [coords, zoom, map]);
  return null;
}

interface Props {
  isLandingPage?: boolean;
}

export default function LiveInventoryMap({ isLandingPage = false }: Props) {
  const [zones, setZones] = useState<Zone[]>(DEFAULT_ZONES);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mapZoom, setMapZoom] = useState(isLandingPage ? 11 : 12);
  const [isReady, setIsReady] = useState(false);

  // Load zones from Firestore, fall back to hardcoded defaults if empty
  useEffect(() => {
    getDocs(collection(db, 'zones')).then((snap) => {
      if (!snap.empty) {
        const fetched: Zone[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nameAr: data.name_ar ?? d.id,
            nameEn: data.name_en ?? d.id,
            coords: [data.coordinates?.lat ?? 30.06, data.coordinates?.lng ?? 31.60] as [number, number],
            radius: data.radius ?? 6000,
            color: data.color ?? '#D4AF37',
            compounds: data.compounds ?? [],
          };
        });
        setZones(fetched);
      }
    }).catch(() => { /* keep defaults */ });
  }, []);

  useEffect(() => {
    setIsReady(true);
    // Seed default counts until Firestore properties are loaded
    setCounts({
      new_cairo: 142,
      admin_capital: 87,
      shorouk: 61,
      madinaty: 34,
    });

    const unsub = onSnapshot(collection(db, 'properties'), (snapshot) => {
      if (snapshot.empty) return;
      const newCounts: Record<string, number> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.zoneId) {
          newCounts[data.zoneId] = (newCounts[data.zoneId] || 0) + 1;
        }
      });
      setCounts(newCounts);
    });

    return () => unsub();
  }, []);

  const handleZoneClick = (zone: Zone) => {
    setSelectedZone(zone.id === selectedZone ? null : zone.id);
    setMapZoom(zone.id === selectedZone ? 11 : 13);
  };

  const getZoneCount = (id: string) => counts[id] || 0;

  if (!isReady) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full lg:h-[800px]">
      {/* MAP SURFACE */}
      <div className="relative flex-1 rounded-[32px] overflow-hidden min-h-[400px] border border-white/10">
        <MapContainer
          center={MAP_CENTER}
          zoom={mapZoom}
          scrollWheelZoom={false}
          zoomControl={false}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
          />

          {zones.map(zone => (
            <Marker 
              key={zone.id} 
              position={zone.coords}
              icon={createAppleMarker(getZoneCount(zone.id), selectedZone === zone.id, isLandingPage)}
              eventHandlers={{ click: () => handleZoneClick(zone) }}
            >
              <Popup className="apple-popup">
                <div className="p-6 min-w-[280px] rounded-3xl bg-[#050B14] text-[#F4F0E8] border border-[#D4AF37]/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="m-0 text-[20px] font-extrabold text-[#C9A84C]">{zone.nameEn}</h3>
                      <p className="m-0 text-[13px] opacity-60">{getZoneCount(zone.id)} Units Found</p>
                    </div>
                    <div className="bg-green-500/10 text-green-500 px-3 py-1.5 rounded-full text-[10px] font-black">BOS LIVE</div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="text-[10px] font-extrabold text-[#C9A84C] tracking-widest uppercase opacity-80">Featured Compounds</div>
                    {zone.compounds.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div>
                          <div className="text-[14px] font-bold">{c.name}</div>
                          <div className="text-[11px] opacity-50">Yield: {c.yield} / yr</div>
                        </div>
                        <div className="text-[14px] font-black text-[#C9A84C]">{c.availability}</div>
                      </div>
                    ))}
                  </div>

                  <button className="mt-5 w-full p-3.5 rounded-xl font-extrabold text-[11px] tracking-widest border-none cursor-pointer bg-[#C9A84C] text-black hover:bg-[#D4AF37] transition-colors">
                    VIEW ALL LISTINGS
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {selectedZone && (
            <RecenterMap 
              coords={zones.find(z => z.id === selectedZone)?.coords || MAP_CENTER} 
              zoom={mapZoom} 
            />
          )}
        </MapContainer>

        {/* Legend Overlay */}
        <div className="absolute bottom-5 left-5 z-[1000] p-4 px-6 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#C9A84C] rounded-full"></div>
              <span className="text-[11px] font-bold opacity-70">PRIMARY ZONE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[11px] font-bold opacity-70">BOS LIVE SYNC</span>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE SIDEBAR */}
      <div className="w-full lg:w-[350px] flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-1 h-5 bg-[#C9A84C] rounded-sm"></div>
          <h2 className="text-[18px] font-extrabold m-0 text-[#F4F0E8]">Zone Intelligence</h2>
        </div>

        {zones.map(zone => {
          const isActive = selectedZone === zone.id;
          return (
            <motion.div
              key={zone.id}
              onClick={() => handleZoneClick(zone)}
              whileHover={{ x: 5 }}
              className={`p-6 rounded-3xl cursor-pointer transition-all duration-300 border text-[#F4F0E8] ${
                isActive 
                  ? 'bg-[#C9A84C]/5 border-[#C9A84C] shadow-[0_15px_35px_rgba(201,168,76,0.1)]' 
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[16px] font-extrabold">{zone.nameEn}</span>
                <span className="text-[18px] font-black text-[#C9A84C]">{getZoneCount(zone.id)}</span>
              </div>
              <div className="text-[12px] opacity-50 mb-4">{zone.nameAr}</div>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-black/5 pt-4 flex flex-col gap-2">
                      {zone.compounds.slice(0, 3).map((comp, i) => (
                        <div key={i} className="flex justify-between text-[12px]">
                          <span className="font-semibold">{comp.name}</span>
                          <span className="opacity-60">{comp.availability} Avail.</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-1.5 text-[10px] text-[#C9A84C] font-extrabold mt-2.5">
                        SEE ALL COMPOUNDS <ChevronRight size={10} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <style>{`
        .apple-popup .leaflet-popup-content-wrapper {
          background: #050B14;
          color: #F4F0E8;
          border-radius: 24px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
          border: 1px solid rgba(212,175,55,0.2);
        }
        .apple-popup .leaflet-popup-content { margin: 0; }
        .apple-popup .leaflet-popup-tip-container { display: none; }
      `}</style>
    </div>
  );
}
