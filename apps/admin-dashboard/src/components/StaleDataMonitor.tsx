"use client";

import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, CheckCircle, Clock, Filter, Trash2 } from 'lucide-react';

export default function StaleDataMonitor() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    // We look for items that haven't been updated in 30 days
    // For this UI, we can calculate the threshold on the client
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const threshold = Timestamp.fromDate(thirtyDaysAgo);

    const q = query(
      collection(db, 'units'),
      where('updatedAt', '<', threshold),
      orderBy('updatedAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staleItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(staleItems);
      setLoading(false);
    }, (error) => {
      console.error("Stale data sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await updateDoc(doc(db, 'units', id), {
        updatedAt: serverTimestamp(),
        status: 'available' // Reset status to active/available
      });
    } catch (error) {
      console.error("Failed to refresh unit:", error);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleMarkSold = async (id: string) => {
    try {
      await updateDoc(doc(db, 'units', id), {
        status: 'sold',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to mark sold:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="cinematic-text text-3xl mb-2">Inventory Maintenance</h1>
          <p className="text-secondary text-sm">Monitoring {items.length} units with stale synchronization signals ({'>'}30 days)</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-gold">
            <AlertTriangle size={14} />
            CRITICAL INTEGRITY MODE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="luxury-card flex gap-6"
            >
              <div className="w-32 h-32 rounded-2xl bg-navy-dark overflow-hidden flex-shrink-0 border border-gold/20">
                {item.featuredImage ? (
                  <img src={item.featuredImage} alt={item.title} className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <Clock size={32} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <span className="text-[10px] font-black uppercase text-secondary bg-surface-2 px-2 py-1 rounded">
                    Code: {item.code || 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-secondary mb-4">
                  <span className="flex items-center gap-1">
                    <Filter size={12} /> {item.propertyType}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Last Sync: {item.updatedAt instanceof Timestamp ? item.updatedAt.toDate().toLocaleDateString() : 'Unknown'}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleRefresh(item.id!)}
                    disabled={refreshingId === item.id}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    {refreshingId === item.id ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                    VERIFY & REFRESH
                  </button>
                  <button 
                    onClick={() => handleMarkSold(item.id!)}
                    className="btn btn-outline btn-sm text-error hover:bg-error/10"
                  >
                    <Trash2 size={14} />
                    MARK SOLD
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="col-span-2 py-20 text-center glass-panel rounded-3xl opacity-50">
            <CheckCircle size={48} className="mx-auto mb-4 text-success" />
            <h2 className="text-xl font-bold">Portfolio Integrity 100%</h2>
            <p className="text-sm">No stale units detected in the current orchestration window.</p>
          </div>
        )}
      </div>
    </div>
  );
}
