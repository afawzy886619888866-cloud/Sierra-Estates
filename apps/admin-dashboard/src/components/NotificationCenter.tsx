import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SierraNotification } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterProps {
  isAr: boolean;
}

export default function NotificationCenter({ isAr }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<SierraNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Read notifications from Firestore in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: SierraNotification[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            type: data.type,
            title: data.title,
            titleAr: data.titleAr || undefined,
            message: data.message,
            messageAr: data.messageAr || undefined,
            read: !!data.read,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          });
        });
        setNotifications(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      }
    );

    return () => unsub();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications/all');
    }
  };

  const handleClearAll = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notifications/all');
    }
  };

  // Icon selector based on type
  const getTypeMeta = (type: SierraNotification['type']) => {
    switch (type) {
      case 'lead':
        return { emoji: '👤', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'listing':
        return { emoji: '🏘️', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'error':
        return { emoji: '⚠️', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
      case 'system':
      default:
        return { emoji: '⚙️', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef} id="notification-center-container">
      {/* Target Trigger Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full border border-slate-800 text-slate-400 hover:text-white transition duration-150 active:scale-95 text-sm select-none cursor-pointer flex items-center justify-center ${
          isOpen ? 'bg-[#0a0f1d] border-cyan-500/45 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' : ''
        }`}
        title={isAr ? 'الإشعارات' : 'Notifications'}
        id="btn-notification-bell"
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-semibold font-mono text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse select-none">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute mt-2 w-80 md:w-96 bg-[#0a0f1d] border border-slate-800 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] z-50 overflow-hidden ${
              isAr ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
            }`}
          >
            {/* Header bar */}
            <div className={`p-4 border-b border-slate-800 bg-[#0c1326] flex items-center justify-between select-none ${isAr ? 'flex-row-reverse' : ''}`}>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {isAr ? 'التنبيهات الإدارية' : 'Admin Alerts'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isAr 
                    ? `لديك ${unreadCount} تنبيهات غير مقروءة` 
                    : `You have ${unreadCount} unread occurrences`}
                </p>
              </div>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition duration-150 cursor-pointer"
                  >
                    {isAr ? 'مقروء للكل' : 'Mark all read'}
                  </button>
                  <span className="text-slate-700 text-[10px] select-none">|</span>
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold transition duration-150 cursor-pointer"
                  >
                    {isAr ? 'تنظيف الكُل' : 'Clear all'}
                  </button>
                </div>
              )}
            </div>

            {/* Notifications feed */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-850/60 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 select-none">
                  <div className="text-2xl mb-2">🌴</div>
                  <p className="text-xs">{isAr ? 'كل شيء مستقر وهادئ.' : 'System is optimal. No active alerts.'}</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const meta = getTypeMeta(item.type);
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 flex items-start gap-3 transition duration-150 relative group ${
                        !item.read ? 'bg-[#121c32]/35 border-l-2 border-cyan-500/50' : 'bg-[#0a0f1d]'
                      } ${isAr ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Left icon wrapper */}
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border font-sans text-xs select-none ${meta.color}`}>
                        {meta.emoji}
                      </div>

                      {/* Msg Details */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`flex items-baseline justify-between gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                          <h4 className={`text-xs font-semibold ${item.read ? 'text-slate-400' : 'text-slate-200'}`}>
                            {isAr ? (item.titleAr || item.title) : item.title}
                          </h4>
                          <span className="text-[9px] text-slate-500 whitespace-nowrap font-mono select-none">
                            {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-1 pr-6 leading-relaxed break-words ${item.read ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isAr ? (item.messageAr || item.message) : item.message}
                        </p>
                      </div>

                      {/* Right action/dismiss drawer buttons */}
                      <div className={`absolute top-3.5 flex gap-1 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
                        isAr ? 'left-3' : 'right-3'
                      }`}>
                        {!item.read && (
                          <button
                            onClick={() => handleMarkAsRead(item.id)}
                            className="p-1 hover:bg-cyan-500/10 text-cyan-400 rounded transition cursor-pointer"
                            title={isAr ? 'تحديد كمقروء' : 'Mark as read'}
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 hover:bg-red-500/10 text-red-400 rounded transition cursor-pointer"
                          title={isAr ? 'حذف' : 'Dismiss'}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer summary bar */}
            <div className="p-2 border-t border-slate-800 bg-[#070b14] text-center select-none">
              <p className="text-[9px] font-mono tracking-wider text-slate-500 uppercase">
                ⚙️ SIERRA NETWORK REAL-TIME ALERTS
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
