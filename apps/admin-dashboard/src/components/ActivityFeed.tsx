import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Home, 
  Cpu, 
  Settings, 
  AlertTriangle, 
  FileText, 
  Clock, 
  RefreshCw,
  Activity
} from 'lucide-react';

interface SystemLog {
  id: string;
  action: string;
  category: string;
  operator: string;
  timestamp: any; // Firestore Timestamp or Date or string
  details?: string;
}

export default function ActivityFeed() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const logsCol = collection(db, 'system_logs');
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(15));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLogs: SystemLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedLogs.push({
            id: doc.id,
            action: data.action || '',
            category: data.category || 'system',
            operator: data.operator || 'System',
            timestamp: data.timestamp,
            details: data.details || '',
          });
        });
        setLogs(fetchedLogs);
        setLoading(false);
        setErrorStatus(null);
      },
      (err) => {
        console.error('Error listening to system_logs:', err);
        setErrorStatus(err.message);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'system_logs');
      }
    );

    return () => unsub();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'lead':
        return <User className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case 'listing':
        return <Home className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'workflow':
        return <Activity className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case 'system':
      case 'settings':
        return <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
      default:
        return <Cpu className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getCategoryStyles = (category: string) => {
    switch (category.toLowerCase()) {
      case 'lead':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      case 'listing':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      case 'workflow':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
      case 'error':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return 'Just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  };

  return (
    <div id="activity-feed-container" className="flex flex-col h-full bg-white dark:bg-[#0a0f1d]/70 rounded-xl border border-slate-200/80 dark:border-slate-800/50 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-[#070b14]/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">System Live Activity Feed</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
          </span>
          Live Stream
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 max-h-[420px]">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            <span className="text-xs">Loading activity stream...</span>
          </div>
        )}

        {!loading && errorStatus && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-rose-500 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Failed to connect to activity stream: {errorStatus}</span>
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p className="text-xs text-slate-400 font-medium">No recent logs recorded.</p>
          </div>
        )}

        <div className="relative border-l border-slate-100 dark:border-slate-850 ml-3 pl-4 space-y-4">
          <AnimatePresence initial={false}>
            {logs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10, y: -5 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.03 }}
                className="relative group pr-1"
                id={`activity-feed-item-${log.id}`}
              >
                {/* Node indicator */}
                <div className="absolute -left-[25px] top-1 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 shadow-sm transition-transform group-hover:scale-110">
                  {getCategoryIcon(log.category)}
                </div>

                <div className="bg-slate-50/50 dark:bg-[#0b1120]/30 hover:bg-slate-50 dark:hover:bg-[#0b1120]/50 border border-slate-100 dark:border-slate-800/30 hover:border-slate-200 dark:hover:border-slate-800/60 rounded-lg p-2.5 transition-all duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium tracking-wide leading-relaxed">
                        {log.action}
                      </p>
                      
                      {log.details && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                          {log.details}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-mono leading-none tracking-wider px-1.5 py-0.5 rounded border uppercase ${getCategoryStyles(log.category)}`}>
                          {log.category}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          by {log.operator}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1 shrink-0 font-medium">
                      <Clock className="w-3 h-3 text-slate-350 dark:text-slate-600" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
