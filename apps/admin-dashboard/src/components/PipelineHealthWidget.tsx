import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface PipelineHealthWidgetProps {
  T?: (key: string) => string;
}

export default function PipelineHealthWidget({ T }: PipelineHealthWidgetProps) {
  const [qualifiedCount, setQualifiedCount] = useState<number>(0);
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [notificationsCount, setNotificationsCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  useEffect(() => {
    // 1. Subscribe to qualified leads
    const unsubLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
      let qualified = 0;
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.status?.includes('Qualified') || d.qualification_data || d.qualification || d.lead_ready) {
          qualified++;
        }
      });
      setQualifiedCount(qualified);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, () => {});

    // 2. Subscribe to viewing appointments
    const unsubApp = onSnapshot(collection(db, 'viewing_appointments'), (snapshot) => {
      setAppointmentsCount(snapshot.size || 0);
    }, () => {});

    // 3. Subscribe to real-time notification alerts
    const unsubNotif = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      setNotificationsCount(snapshot.size || 0);
    }, () => {});

    return () => {
      unsubLeads();
      unsubApp();
      unsubNotif();
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900/90 via-[#0a0f1d]/95 to-slate-950/90 border border-cyan-500/20 rounded-2xl p-5 shadow-2xl backdrop-blur-xl mb-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping absolute inset-0 opacity-75"></div>
            <div className="w-3.5 h-3.5 bg-emerald-400 rounded-full relative shadow-[0_0_12px_rgba(52,211,153,0.8)]"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Sierra Real-Time Intelligence & Ingestion Pipeline
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Live Daemon
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gemini 2.0 Flash Consultant • Obsidian Memory Vault (14 Notes) • Property Finder Webhooks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 self-start md:self-auto">
          <span className="text-slate-500">Last Synced:</span>
          <span className="text-cyan-400 font-semibold">{lastSyncTime}</span>
        </div>
      </div>

      {/* Grid KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: WhatsApp Bot Daemon */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold">WhatsApp AI Bot</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Active
            </span>
          </div>
          <div className="text-lg font-bold text-white font-mono flex items-baseline gap-1.5">
            <span>Gemini 2.0</span>
            <span className="text-xs font-normal text-cyan-400">Flash</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Dynamic AR/EN dialect mirroring
          </p>
        </div>

        {/* Card 2: Stage 3 Qualified Leads */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold">Qualified Leads (S3)</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              Real-Time
            </span>
          </div>
          <div className="text-lg font-bold text-cyan-300 font-mono">
            {qualifiedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Structured criteria extracted
          </p>
        </div>

        {/* Card 3: 1-Click Calendar Viewings */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold">Viewing Bookings</span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Calendar
            </span>
          </div>
          <div className="text-lg font-bold text-amber-300 font-mono">
            {appointmentsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Google Calendar invites synced
          </p>
        </div>

        {/* Card 4: Memory Vault & Brochures */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold">Knowledge Vault</span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
              14 Notes
            </span>
          </div>
          <div className="text-lg font-bold text-purple-300 font-mono">
            8 Compounds
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Brochures & pricing index live
          </p>
        </div>
      </div>
    </div>
  );
}
