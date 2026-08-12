import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Workflow } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function GlobalProgressTracker() {
  const [activeTasks, setActiveTasks] = useState<Workflow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Only fetch workflows that are active to show in the header
    const q = query(
      collection(db, 'workflows'),
      where('status', '==', 'active')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const running: Workflow[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        running.push({
          id: doc.id,
          name: data.name || '',
          nameAr: data.nameAr || '',
          desc: data.desc || '',
          descAr: data.descAr || '',
          status: data.status || 'paused',
          color: data.color || '#94a3b8',
          runs: data.runs || 0,
          last: data.last || 'N/A',
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        });
      });
      setActiveTasks(running);
    }, (err) => {
      console.error("Failed to fetch running tasks for tracker", err);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeTasks.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeTasks.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTasks.length]);

  if (activeTasks.length === 0) return null;

  const currentTask = activeTasks[currentIndex] || activeTasks[0];

  return (
    <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-1.5 overflow-hidden max-w-sm hidden lg:flex shadow-inner">
      <div className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
      </div>
      <div className="flex flex-col min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTask.id}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest truncate"
          >
            Executing: {currentTask.name}
          </motion.div>
        </AnimatePresence>
      </div>
      {activeTasks.length > 1 && (
        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono shrink-0">
          +{activeTasks.length - 1} ACTIVE
        </span>
      )}
    </div>
  );
}
