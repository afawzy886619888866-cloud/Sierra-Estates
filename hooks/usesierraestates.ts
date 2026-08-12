"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

/**
 * usesierraestates
 * The master hook for the Sierra Estates Frontend.
 * abstracts away the direct Firebase calls for Claude Code.
 */
export function usesierraestates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Units (Inventory) ---
  const [units, setUnits] = useState<any[]>([]);
  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "units"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const unitData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setUnits(unitData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- Leads & Proposals ---
  const getLeadData = async (leadId: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, "stakeholders", leadId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // --- Agent Commands ---
  const triggerAgent = async (agentName: string, action: string, payload: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    units,
    loading,
    error,
    getLeadData,
    triggerAgent
  };
}
