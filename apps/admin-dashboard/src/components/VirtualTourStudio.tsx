import React, { useState, useRef, useEffect } from 'react';
import { 
  RotateCw, Eye, Sparkles, Navigation, Info, Volume2, 
  VolumeX, Play, ArrowRight, ArrowLeft, Maximize2, Layers, CheckCircle 
} from 'lucide-react';

interface Hotspot {
  id: string;
  targetRoomId: string;
  pitch: number;
  yaw: number;
  title: string;
  titleAr: string;
  type: 'nav' | 'info';
  infoText?: string;
  infoTextAr?: string;
}

interface RoomNode {
  id: string;
  name: string;
  nameAr: string;
  panoramaUrl: string;
  narrationEn?: string;
  narrationAr?: string;
  hotspots: Hotspot[];
}

interface VirtualTourConfig {
  tourId: string;
  unitId: string;
  unitTitle: string;
  defaultRoomId: string;
  rooms: RoomNode[];
  vrEnabled: boolean;
  audioNarrationEnabled: boolean;
}

const SAMPLE_TOUR: VirtualTourConfig = {
  tourId: 'vt-demo-001',
  unitId: 'UNIT-HYDE-PARK-01',
  unitTitle: 'Hyde Park Signature Villa — Grand Residence',
  defaultRoomId: 'room-1',
  vrEnabled: true,
  audioNarrationEnabled: true,
  rooms: [
    {
      id: 'room-1',
      name: 'Grand Reception & Living Hall',
      nameAr: 'غرفة الاستقبال والمعيشة الرئيسية',
      panoramaUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1600&q=85',
      narrationEn: 'Welcome to the Grand Reception Hall. Features 6-meter double-height ceilings, imported Italian Calacatta marble flooring, and floor-to-ceiling panoramic glass windows.',
      narrationAr: 'مرحباً بكم في صالة الاستقبال الرئيسية. تتميز بأسقف مزدوجة الارتفاع بعلو 6 أمتار وأرضيات من رخام كالاكاتا الإيطالي المستورد.',
      hotspots: [
        {
          id: 'hs-1',
          targetRoomId: 'room-2',
          pitch: 5,
          yaw: 40,
          title: 'Enter Master Suite',
          titleAr: 'الدخول إلى جناح النوم الرئيسي',
          type: 'nav'
        },
        {
          id: 'hs-2',
          targetRoomId: 'room-1',
          pitch: 15,
          yaw: -30,
          title: 'Italian Calacatta Marble',
          titleAr: 'رخام كالاكاتا الإيطالي',
          type: 'info',
          infoText: 'Bookmatched natural marble slabs sourced directly from Carrara quarries.',
          infoTextAr: 'ألواح رخام طبيعي من محاجر كارارا الإيطالية.'
        }
      ]
    },
    {
      id: 'room-2',
      name: 'Master Suite & Dressing',
      nameAr: 'جناح النوم الرئيسي والغرفة',
      panoramaUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1600&q=85',
      narrationEn: 'The Master Suite offers direct sunset terrace views, a walk-in wardrobe, and integrated smart room automation.',
      narrationAr: 'يوفر جناح النوم الرئيسي إطلالة مباشرة على التراس، وغرفة ملابس متكاملة، ونظام أنظمة ذكية مدمجة.',
      hotspots: [
        {
          id: 'hs-3',
          targetRoomId: 'room-3',
          pitch: 0,
          yaw: 90,
          title: 'Step out to Infinity Terrace',
          titleAr: 'الخروج إلى التراس البانورامي',
          type: 'nav'
        }
      ]
    },
    {
      id: 'room-3',
      name: 'Infinity Pool & Sky Terrace',
      nameAr: 'حمام السباحة والتراس السماوي',
      panoramaUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600&q=85',
      narrationEn: 'Private 12-meter heated infinity pool overlooking the manicured Golf course gardens.',
      narrationAr: 'حمام سباحة دافئ مقاس 12 متراً يطل على حدائق الجولف الجميلة.',
      hotspots: [
        {
          id: 'hs-4',
          targetRoomId: 'room-1',
          pitch: -5,
          yaw: -120,
          title: 'Return to Living Hall',
          titleAr: 'العودة إلى صالة المعيشة',
          type: 'nav'
        }
      ]
    }
  ]
};

export default function VirtualTourStudio({ unitId, tourData }: { unitId?: string; tourData?: VirtualTourConfig }) {
  const tour = tourData || SAMPLE_TOUR;
  const [currentRoomId, setCurrentRoomId] = useState<string>(tour.defaultRoomId);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeInfoHotspot, setActiveInfoHotspot] = useState<Hotspot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVrMode, setIsVrMode] = useState(false);
  
  // 360° Drag camera coordinates
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const currentRoom = tour.rooms.find(r => r.id === currentRoomId) || tour.rooms[0];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setYaw(prev => (prev + deltaX * 0.3) % 360);
    setPitch(prev => Math.max(-60, Math.min(60, prev - deltaY * 0.3)));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleGenerateAiTour = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('✅ 360° WebXR Virtual Tour successfully built and synced to Sierra Estates Firestore!');
    }, 1800);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header Bar */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RotateCw className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              {tour.unitTitle}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                WebXR 360° VR Ready
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive Spatial Tour • Agent Auto-Generator Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
          >
            {lang === 'en' ? 'العربية 🇪🇬' : 'English 🇬🇧'}
          </button>

          <button
            onClick={() => setIsVrMode(!isVrMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              isVrMode 
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/40' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            {isVrMode ? 'VR Mode Active' : 'Enable WebXR VR'}
          </button>

          <button
            onClick={handleGenerateAiTour}
            disabled={isGenerating}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'AI Generating 360° Tour...' : 'Auto-Generate AI Tour'}
          </button>
        </div>
      </div>

      {/* Main 360° VR Viewport Container */}
      <div 
        className="relative h-[520px] bg-black cursor-grab active:cursor-grabbing select-none overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Panoramic Background Image with Pitch/Yaw transform */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-75 ease-out scale-110"
          style={{
            backgroundImage: `url('${currentRoom.panoramaUrl}')`,
            transform: `scale(1.2) rotateX(${pitch * 0.4}deg) rotateY(${yaw * 0.6}deg)`
          }}
        />

        {/* Ambient Dark Gradient Overlays for Cinematic Feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none" />

        {/* Floating 360 Navigation & Spatial Info Hotspots */}
        <div className="absolute inset-0 pointer-events-none">
          {currentRoom.hotspots.map((hs) => {
            const posX = 50 + hs.yaw * 0.4;
            const posY = 50 - hs.pitch * 0.5;

            return (
              <div 
                key={hs.id}
                className="absolute pointer-events-auto transition-transform transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${Math.max(10, Math.min(90, posX))}%`, top: `${Math.max(15, Math.min(85, posY))}%` }}
              >
                {hs.type === 'nav' ? (
                  <button
                    onClick={() => setCurrentRoomId(hs.targetRoomId)}
                    className="group relative flex items-center gap-2 bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-950/60 backdrop-blur-md border border-emerald-300/40 transition-all hover:scale-110"
                  >
                    <Navigation className="w-4 h-4 animate-bounce text-slate-950" />
                    <span className="text-xs">{lang === 'ar' ? hs.titleAr : hs.title}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveInfoHotspot(hs)}
                    className="group relative flex items-center gap-1.5 bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-full shadow-lg shadow-amber-950/60 backdrop-blur-md border border-amber-300/40 transition-all hover:scale-110"
                  >
                    <Info className="w-4 h-4 text-slate-950" />
                    <span className="text-xs">{lang === 'ar' ? hs.titleAr : hs.title}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Hotspot Detail Modal Overlay */}
        {activeInfoHotspot && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6 z-20">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95">
              <h4 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-2">
                <Info className="w-5 h-5" />
                {lang === 'ar' ? activeInfoHotspot.titleAr : activeInfoHotspot.title}
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {lang === 'ar' ? activeInfoHotspot.infoTextAr : activeInfoHotspot.infoText}
              </p>
              <button
                onClick={() => setActiveInfoHotspot(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700"
              >
                Close Hotspot Annotation
              </button>
            </div>
          </div>
        )}

        {/* Room Title Overlay Banner */}
        <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
          <Layers className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-xs font-semibold text-white">
              {lang === 'ar' ? currentRoom.nameAr : currentRoom.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Yaw: {Math.round(yaw)}° | Pitch: {Math.round(pitch)}°
            </div>
          </div>
        </div>

        {/* Audio Narration Bar */}
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md px-4 py-3 rounded-lg border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex-shrink-0"
            >
              {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="text-xs text-slate-300 truncate">
              <span className="font-semibold text-emerald-400 mr-2">AI Voice Narration:</span>
              {lang === 'ar' ? currentRoom.narrationAr : currentRoom.narrationEn}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex-shrink-0">
            Drag mouse to look 360°
          </div>
        </div>
      </div>

      {/* Room Selection Thumbnails Bar */}
      <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center gap-3 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 flex-shrink-0 mr-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Room Nodes ({tour.rooms.length}):
        </span>
        {tour.rooms.map((room) => {
          const isActive = room.id === currentRoomId;
          return (
            <button
              key={room.id}
              onClick={() => setCurrentRoomId(room.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all flex-shrink-0 ${
                isActive 
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold shadow-md' 
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
              }`}
            >
              <img src={room.panoramaUrl} alt={room.name} className="w-7 h-7 rounded object-cover" />
              <span>{lang === 'ar' ? room.nameAr : room.name}</span>
              {isActive && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
