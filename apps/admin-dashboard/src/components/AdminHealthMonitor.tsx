import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Database, ShieldCheck, HardDrive, AlertTriangle, RefreshCw } from 'lucide-react';

interface HealthData {
  dbLatency: number;
  authUptime: number;
  storageQuota: number;
  updatedAt?: any;
}

export default function AdminHealthMonitor() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingStatus, setTestingStatus] = useState(false);

  // Monitor auth status to register Firestore listeners only when signed in (avoiding permission warnings)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHealth(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Set up the real-time onSnapshot listener for system_health
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const healthCollection = collection(db, 'system_health');
    
    // We observe the entire collection, specifically looking for 'current_status' doc
    const unsubscribeSnapshot = onSnapshot(
      healthCollection,
      (snapshot) => {
        let foundStatus: HealthData | null = null;
        snapshot.forEach((doc) => {
          if (doc.id === 'current_status') {
            foundStatus = doc.data() as HealthData;
          }
        });

        // Fallback to first available document if current_status not specifically matched
        if (!foundStatus && !snapshot.empty) {
          foundStatus = snapshot.docs[0].data() as HealthData;
        }

        if (foundStatus) {
          setHealth(foundStatus);
          setError(null);
        } else {
          // If completely empty, we can auto-provision a state locally
          setHealth({
            dbLatency: 14,
            authUptime: 99.99,
            storageQuota: 28,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failure inside system health snapshot listener:', err);
        setError('Unaligned permissions');
        setLoading(false);
      }
    );

    return () => unsubscribeSnapshot();
  }, [user]);

  // Performs a real-time simulation update of the metrics in Firestore to demonstrate database reactivity
  const triggerTelemetrySimulation = async () => {
    if (!user || testingStatus) return;
    setTestingStatus(true);
    
    try {
      // Simulate real-time fluctuated measurements
      const simulatedLatency = Math.floor(Math.random() * 15) + 6; // range 6 - 20ms
      const simulatedUptime = parseFloat((99.9 + Math.random() * 0.1).toFixed(3)); // range 99.900% - 100.000%
      const simulatedQuota = Math.min(100, Math.max(0, (health?.storageQuota || 24) + (Math.random() > 0.5 ? 1 : -1)));

      const docRef = doc(db, 'system_health', 'current_status');
      
      await setDoc(docRef, {
        dbLatency: simulatedLatency,
        authUptime: simulatedUptime,
        storageQuota: simulatedQuota,
        updatedAt: new Date()
      }, { merge: true });

    } catch (err) {
      console.warn('Unable to write health snapshot simulation (only Admins allowed):', err);
    } finally {
      setTimeout(() => setTestingStatus(false), 800);
    }
  };

  if (!user) return null;

  // Latency indicators
  const getLatencyColor = (ms: number) => {
    if (ms < 15) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (ms < 30) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  // Uptime indicators
  const getUptimeColor = (pct: number) => {
    if (pct >= 99.9) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    if (pct >= 99.0) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  // Storage percentage indicators
  const getStorageColor = (pct: number) => {
    if (pct < 70) return 'text-slate-400 bg-slate-950/40 border-slate-800';
    if (pct < 90) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="flex items-center gap-2 select-none" id="admin-health-monitor">
      {error ? (
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden lg:inline text-[10px] uppercase tracking-wider">Health Blocked</span>
        </div>
      ) : loading || !health ? (
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 bg-slate-800/20 border border-slate-800/40 rounded font-medium animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span className="text-[10px] uppercase tracking-wider">Acquiring Health Metrics...</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* DB Latency Metric */}
          <div 
            onClick={triggerTelemetrySimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-full font-mono cursor-pointer transition-all duration-300 transform active:scale-95 ${getLatencyColor(health.dbLatency)}`}
            title="Database response latency. Click to simulate a live query ping!"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline font-sans text-[10px] text-slate-400">DB:</span>
            <span>{health.dbLatency}ms</span>
          </div>

          {/* Auth Uptime Metric */}
          <div 
            onClick={triggerTelemetrySimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-full font-mono cursor-pointer transition-all duration-300 transform active:scale-95 ${getUptimeColor(health.authUptime)}`}
            title="Identity & access provider uptime metric. Click to simulation-recheck!"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline font-sans text-[10px] text-slate-400">AUTH:</span>
            <span>{health.authUptime}%</span>
          </div>

          {/* Storage Quotas Metric */}
          <div 
            onClick={triggerTelemetrySimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-full font-mono cursor-pointer transition-all duration-300 transform active:scale-95 ${getStorageColor(health.storageQuota)}`}
            title="Storage capacity used footprint metrics. Click to trigger storage scan simulation!"
          >
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline font-sans text-[10px] text-slate-400">STORAGE:</span>
            <span>{health.storageQuota}%</span>
          </div>

          {/* Simulate Refresh button */}
          <button
            onClick={triggerTelemetrySimulation}
            disabled={testingStatus}
            className={`p-1.5 text-slate-500 hover:text-cyan-400 rounded-full border border-transparent hover:border-slate-800 hover:bg-slate-950/40 transition-all ${testingStatus ? 'text-cyan-400 animate-spin' : ''}`}
            title="Update & ping telemetry metrics state in database"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
