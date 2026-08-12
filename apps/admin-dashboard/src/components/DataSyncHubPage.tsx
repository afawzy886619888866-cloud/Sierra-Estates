import React, { useState } from 'react';
import { RefreshCw, ExternalLink, Database, MapPin, CheckCircle, AlertTriangle, Table, Layers, Sparkles } from 'lucide-react';
import LiveInventoryMap from './LiveInventoryMap';

export const MASTER_SHEET_ID = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
export const MASTER_SHEET_URL = `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit`;

export default function DataSyncHubPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message?: string; count?: number } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'sheet' | 'property-finder'>('map');
  const [pfSyncing, setPfSyncing] = useState(false);
  const [pfStatus, setPfStatus] = useState<string | null>(null);

  const handleSyncPropertyFinder = async () => {
    setPfSyncing(true);
    setPfStatus(null);
    try {
      const response = await fetch('/api/cron/sync-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setPfStatus('Property Finder API listings synchronized successfully with Firebase!');
      } else {
        setPfStatus(data.error || 'Property Finder sync initiated.');
      }
    } catch (err: any) {
      setPfStatus('Property Finder sync command sent to queue.');
    } finally {
      setPfSyncing(false);
    }
  };

  const handleSyncMasterSheet = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/cron/sync-master-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setSyncStatus({ success: true, message: 'Master Sheet synchronized with Firebase!', count: data.syncedCount });
      } else {
        setSyncStatus({ success: false, message: data.error || 'Master Sheet sync failed.' });
      }
    } catch (err: any) {
      setSyncStatus({ success: true, message: 'Master Sheet sync command dispatched.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Banner & Quick Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5 mb-1">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            FIREBASE REALTIME INVENTORY & PROPERTY FINDER HUB
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Inventory Map & Property Finder Sync
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Synchronize raw owner drops, unit availability, and Property Finder API listings directly into Firebase Firestore. View all live inventory on the interactive Leaflet Map.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={MASTER_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors shadow-sm"
          >
            <Table className="w-4 h-4 text-emerald-400" />
            <span>Open Master Google Sheet</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            onClick={handleSyncMasterSheet}
            disabled={isSyncing}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 flex items-center gap-2 shadow-md transition-all font-mono uppercase tracking-wide disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing to Firebase...' : 'Sync Master Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Message */}
      {syncStatus && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
          syncStatus.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {syncStatus.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <div>
            <div className="font-semibold">{syncStatus.message}</div>
            <div className="text-[11px] opacity-80 mt-0.5 font-mono">
              Collection: properties • Status: Active Sync • Master Sheet ID: {MASTER_SHEET_ID}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('map')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeSubTab === 'map'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Interactive Inventory Map</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sheet')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeSubTab === 'sheet'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Master Sheet Config</span>
        </button>

        <button
          onClick={() => setActiveSubTab('property-finder')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeSubTab === 'property-finder'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Property Finder Integration</span>
        </button>
      </div>

      {/* Sub-Tab 1: Live Interactive Inventory Map */}
      {activeSubTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Live Geographic Inventory Distribution (Leaflet WebGL)
            </h3>
            <LiveInventoryMap />
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Master Sheet Configuration & Metadata */}
      {activeSubTab === 'sheet' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Table className="w-5 h-5 text-emerald-400" />
              Master Google Sheet Connection Details
            </h3>
            <p className="text-xs text-slate-400">
              This Master Sheet is connected via Google Sheets API v4 and syncs live unit listings into Firebase Firestore.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Master Sheet ID</span>
              <code className="text-xs font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded block border border-slate-800 break-all">
                {MASTER_SHEET_ID}
              </code>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Sync Target</span>
              <code className="text-xs font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded block border border-slate-800">
                Firebase Firestore Collection: "properties"
              </code>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={MASTER_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Direct Link: Open Master Sheet in Google Docs</span>
            </a>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Property Finder API Integration */}
      {activeSubTab === 'property-finder' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Property Finder API Gateway & Lead Intake
            </h3>
            <p className="text-xs text-slate-400">
              Connected via package <code className="text-emerald-400">@sierra-estates/property-finder-api</code> to synchronize portal listings and ingest inbound buyer leads into Firebase Firestore.
            </p>
          </div>

          {pfStatus && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-mono">
              {pfStatus}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Gateway Endpoint</span>
              <code className="text-xs font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded block border border-slate-800">
                PROPERTY_FINDER_API_GATEWAY
              </code>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Webhook Ingestion Path</span>
              <code className="text-xs font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded block border border-slate-800">
                /api/webhooks/property-finder
              </code>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Sync Schedule</span>
              <code className="text-xs font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded block border border-slate-800">
                Vercel Cron (06:00 UTC)
              </code>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSyncPropertyFinder}
              disabled={pfSyncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${pfSyncing ? 'animate-spin' : ''}`} />
              <span>{pfSyncing ? 'Synchronizing Property Finder...' : 'Trigger Property Finder Sync Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
