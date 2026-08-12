"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/models/schema';
import { collection, query, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';

/**
 * usesierraestates
 * The master hook for the Sierra Estates Frontend.
 * abstracts away the direct Firebase calls for Claude Code.
 */
export function usesierraestates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Real-time Streams ---
  const [units, setUnits] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  // 1. Units (Inventory)
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, COLLECTIONS.units));
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

  // 2. Activities (System Logs)
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.activities), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setActivities(logs);
      },
      (err) => {
        setError(err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Users (Human Capital / Team)
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.users));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(usersData);
      },
      (err) => {
        setError(err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. Leads / Stakeholders
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.stakeholders));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const leadsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setLeads(leadsData);
      },
      (err) => {
        setError(err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 5. Strategic Partners
  useEffect(() => {
    const q = query(collection(db, 'partners'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const partnersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPartners(partnersData);
      },
      (err) => {
        setError(err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 6. Sales
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.sales));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const salesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setSales(salesData);
      },
      (err) => {
        setError(err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- Lead Detail Operations ---
  const getLeadData = async (leadId: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, COLLECTIONS.stakeholders, leadId);
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

  // --- Agent Commands / Chat ---
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

  // --- External Integrations: Property Finder API Gateway Sync ---
  const triggerSync = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/property-finder?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Synchronization failed');
      return { success: true, message: data.message };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --- Admin Commands: Orchestrate Deploy Patch ---
  const deployPatch = async (userUid?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userUid ? `Bearer ${userUid}` : ''
        },
        body: JSON.stringify({ type: 'patch' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Deployment pipeline failure');
      return { success: true, message: data.message || 'Deployment initialized' };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    units,
    activities,
    users,
    leads,
    partners,
    sales,
    loading,
    error,
    getLeadData,
    triggerAgent,
    triggerSync,
    deployPatch
  };
}
