/**
 * SIERRA ESTATES — SYNC ENGINE
 * Property Finder ↔ Firestore synchronization with:
 * 1. Editorial override protection (manual edits never overwritten)
 * 2. Deduplicate queue for ambiguous matches
 * 3. Conflict resolution tracking
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────

export interface SyncRecord {
  id?: string;
  pfReferenceNumber: string;
  firestoreDocId: string | null;
  status: 'matched' | 'ambiguous' | 'new' | 'conflict' | 'resolved' | 'skipped';
  matchConfidence: number; // 0-100
  pfData: Record<string, unknown>;
  firestoreData?: Record<string, unknown>;
  conflictFields?: string[];
  resolvedBy?: string;
  resolvedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SyncResult {
  total: number;
  matched: number;
  created: number;
  skipped: number;
  dedupeQueue: number;
  errors: string[];
}

// ─── Constants ───────────────────────────────────────────────────────

const MATCH_THRESHOLD_HIGH = 90;   // Auto-match
const MATCH_THRESHOLD_LOW = 50;    // Send to dedup queue
const COLLECTIONS = {
  listings: 'listings',
  syncQueue: 'syncQueue',
  syncLog: 'syncLog',
} as const;

// ─── Matching Logic ──────────────────────────────────────────────────

/**
 * Calculate match confidence between a PF listing and a Firestore listing.
 * Uses weighted scoring on multiple fields.
 */
export function calculateMatchConfidence(
  pfData: Record<string, unknown>,
  firestoreData: Record<string, unknown>
): number {
  let score = 0;
  let maxScore = 0;

  // Reference number exact match (weight: 40)
  maxScore += 40;
  if (pfData.referenceNumber && pfData.referenceNumber === firestoreData.referenceNumber) {
    score += 40;
  }

  // Title similarity (weight: 20)
  maxScore += 20;
  const pfTitle = String(pfData.title || '').toLowerCase().trim();
  const fsTitle = String(firestoreData.title || '').toLowerCase().trim();
  if (pfTitle && fsTitle) {
    if (pfTitle === fsTitle) {
      score += 20;
    } else if (pfTitle.includes(fsTitle) || fsTitle.includes(pfTitle)) {
      score += 12;
    }
  }

  // Price within 5% (weight: 15)
  maxScore += 15;
  const pfPrice = Number(pfData.price) || 0;
  const fsPrice = Number(firestoreData.price) || 0;
  if (pfPrice > 0 && fsPrice > 0) {
    const priceDiff = Math.abs(pfPrice - fsPrice) / fsPrice;
    if (priceDiff <= 0.05) score += 15;
    else if (priceDiff <= 0.10) score += 8;
  }

  // Location match (weight: 15)
  maxScore += 15;
  const pfLocation = String(pfData.compound || pfData.location || '').toLowerCase();
  const fsLocation = String(firestoreData.compound || firestoreData.location || '').toLowerCase();
  if (pfLocation && fsLocation && pfLocation === fsLocation) {
    score += 15;
  }

  // Size within 5% (weight: 10)
  maxScore += 10;
  const pfSize = Number(pfData.area) || 0;
  const fsSize = Number(firestoreData.area) || 0;
  if (pfSize > 0 && fsSize > 0) {
    const sizeDiff = Math.abs(pfSize - fsSize) / fsSize;
    if (sizeDiff <= 0.05) score += 10;
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

// ─── Editorial Override Protection ──────────────────────────────────

/**
 * Check if a Firestore document has manual overrides.
 * Fields marked as manually edited will NOT be overwritten by sync.
 */
export function getProtectedFields(firestoreData: Record<string, unknown>): string[] {
  const overrides = firestoreData.manualOverrides as string[] | undefined;
  return overrides || [];
}

/**
 * Merge PF data into Firestore data, respecting editorial overrides.
 * Returns the merged data and a list of conflicting fields.
 */
export function mergeWithProtection(
  pfData: Record<string, unknown>,
  firestoreData: Record<string, unknown>,
  protectedFields: string[]
): { merged: Record<string, unknown>; conflicts: string[] } {
  const merged = { ...firestoreData };
  const conflicts: string[] = [];

  for (const [key, pfValue] of Object.entries(pfData)) {
    if (key === 'id' || key === 'manualOverrides' || key === 'syncSource') continue;

    if (protectedFields.includes(key)) {
      // Field is manually overridden — do NOT overwrite
      if (firestoreData[key] !== pfValue) {
        conflicts.push(key);
      }
      continue;
    }

    merged[key] = pfValue;
  }

  merged.syncSource = 'property-finder';
  merged.lastSyncAt = new Date().toISOString();

  return { merged, conflicts };
}

// ─── Sync Queue Management ──────────────────────────────────────────

/**
 * Add an ambiguous match to the dedup review queue.
 */
export async function addToDedupeQueue(record: SyncRecord): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.syncQueue), {
    ...record,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all pending items in the dedup queue.
 */
export async function getPendingDedupeItems(): Promise<SyncRecord[]> {
  const q = query(
    collection(db, COLLECTIONS.syncQueue),
    where('status', 'in', ['ambiguous', 'conflict'])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SyncRecord));
}

/**
 * Resolve a dedup queue item.
 */
export async function resolveDedupeItem(
  queueId: string,
  resolution: 'matched' | 'skipped' | 'new',
  resolvedBy: string,
  firestoreDocId?: string
): Promise<void> {
  const queueRef = doc(db, COLLECTIONS.syncQueue, queueId);
  const queueSnap = await getDoc(queueRef);
  
  if (!queueSnap.exists()) {
    throw new Error('Queue item not found');
  }
  
  const record = queueSnap.data() as SyncRecord;

  if (resolution === 'matched' && firestoreDocId) {
    // 1. Resolve as Match — Apply PF data to existing listing
    const fsRef = doc(db, COLLECTIONS.listings, firestoreDocId);
    const fsSnap = await getDoc(fsRef);
    
    if (fsSnap.exists()) {
      const fsData = fsSnap.data();
      const protectedFields = getProtectedFields(fsData);
      const { merged } = mergeWithProtection(record.pfData as Record<string, unknown>, fsData, protectedFields);
      await updateDoc(fsRef, {
        ...merged,
        lastSyncAt: new Date().toISOString(),
      });
    }
  } else if (resolution === 'new') {
    // 2. Resolve as New — Create new listing
    await addDoc(collection(db, COLLECTIONS.listings), {
      ...record.pfData,
      syncSource: 'property-finder',
      manualOverrides: [],
      lastSyncAt: new Date().toISOString(),
    });
  }

  // 3. Mark the queue item as resolved
  await updateDoc(queueRef, {
    status: resolution === 'matched' ? 'resolved' : resolution,
    firestoreDocId: firestoreDocId || record.firestoreDocId || null,
    resolvedBy,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Normalization ──────────────────────────────────────────────────

/**
 * Standardize incoming Property Finder data to match our Firestore schema.
 * Handles snake_case to camelCase and complex object flattening.
 */
export function normalizePFData(pfRaw: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {
    referenceNumber: pfRaw.reference_number || pfRaw.referenceNumber || '',
    title: typeof pfRaw.title === 'object' ? pfRaw.title.en : pfRaw.title,
    titleAr: typeof pfRaw.title === 'object' ? pfRaw.title.ar : '',
    description: typeof pfRaw.description === 'object' ? pfRaw.description.en : pfRaw.description,
    descriptionAr: typeof pfRaw.description === 'object' ? pfRaw.description.ar : '',
    price: typeof pfRaw.price === 'object' ? Number(pfRaw.price.value) : Number(pfRaw.price),
    currency: typeof pfRaw.price === 'object' ? pfRaw.price.currency : (pfRaw.currency || 'EGP'),
    type: pfRaw.type || 'apartment',
    offeringType: pfRaw.offering_type || pfRaw.offeringType || 'sale',
    bedrooms: Number(pfRaw.bedrooms) || 0,
    bathrooms: Number(pfRaw.bathrooms) || 0,
    area: typeof pfRaw.size === 'object' ? Number(pfRaw.size.value) : Number(pfRaw.area || pfRaw.size),
    areaUnit: typeof pfRaw.size === 'object' ? pfRaw.size.unit : (pfRaw.areaUnit || 'sqm'),
    location: typeof pfRaw.location === 'object' ? pfRaw.location.name : pfRaw.location,
    images: Array.isArray(pfRaw.images) ? pfRaw.images.map((img: any) => typeof img === 'string' ? img : img.url) : [],
    pfId: pfRaw.id || '',
    updatedAtPF: pfRaw.updated_at || pfRaw.updatedAt || new Date().toISOString(),
  };

  return normalized;
}

// ─── Sync Orchestrator ──────────────────────────────────────────────

/**
 * Process a batch of PF listings against the Firestore inventory.
 * Returns a detailed sync result report.
 */
export async function syncBatch(
  pfRawListings: Record<string, unknown>[]
): Promise<SyncResult> {
  const result: SyncResult = {
    total: pfRawListings.length,
    matched: 0,
    created: 0,
    skipped: 0,
    dedupeQueue: 0,
    errors: [],
  };

  for (const pfRaw of pfRawListings) {
    let currentRef = 'unknown';
    try {
      const pfData = normalizePFData(pfRaw);
      currentRef = pfData.referenceNumber;
      const refNum = pfData.referenceNumber;

      // 1. Try exact match by reference number
      const exactQuery = query(
        collection(db, COLLECTIONS.listings),
        where('referenceNumber', '==', refNum)
      );
      const exactSnapshot = await getDocs(exactQuery);

      if (!exactSnapshot.empty) {
        // Exact match found — merge with protection
        const fsDoc = exactSnapshot.docs[0];
        const fsData = fsDoc.data();
        const protectedFields = getProtectedFields(fsData);
        const { merged, conflicts } = mergeWithProtection(pfData, fsData, protectedFields);

        if (conflicts.length > 0) {
          // Has conflicts — add to dedup queue for review
          await addToDedupeQueue({
            pfReferenceNumber: refNum,
            firestoreDocId: fsDoc.id,
            status: 'conflict',
            matchConfidence: 100,
            pfData,
            firestoreData: fsData,
            conflictFields: conflicts,
          });
          result.dedupeQueue++;
        } else {
          // Clean merge — update directly
          await updateDoc(doc(db, COLLECTIONS.listings, fsDoc.id), merged as any);
          result.matched++;
        }
        continue;
      }

      // 2. No exact match — search for fuzzy matches
      const allListingsSnapshot = await getDocs(collection(db, COLLECTIONS.listings));
      let bestMatch: { docId: string; confidence: number; data: Record<string, unknown> } | null = null;

      for (const fsDoc of allListingsSnapshot.docs) {
        const confidence = calculateMatchConfidence(pfData, fsDoc.data());
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { docId: fsDoc.id, confidence, data: fsDoc.data() };
        }
      }

      if (bestMatch && bestMatch.confidence >= MATCH_THRESHOLD_HIGH) {
        // High confidence — auto-merge with protection
        const protectedFields = getProtectedFields(bestMatch.data);
        const { merged } = mergeWithProtection(pfData, bestMatch.data, protectedFields);
        await updateDoc(doc(db, COLLECTIONS.listings, bestMatch.docId), merged as any);
        result.matched++;
      } else if (bestMatch && bestMatch.confidence >= MATCH_THRESHOLD_LOW) {
        // Medium confidence — send to dedup queue
        await addToDedupeQueue({
          pfReferenceNumber: refNum,
          firestoreDocId: bestMatch.docId,
          status: 'ambiguous',
          matchConfidence: bestMatch.confidence,
          pfData,
          firestoreData: bestMatch.data,
        });
        result.dedupeQueue++;
      } else {
        // No match at all — create new listing
        await addDoc(collection(db, COLLECTIONS.listings), {
          ...pfData,
          syncSource: 'property-finder',
          manualOverrides: [],
          lastSyncAt: new Date().toISOString(),
        });
        result.created++;
      }
    } catch (error) {
      result.errors.push(`Failed to sync ${currentRef}: ${error}`);
    }
  }

  // Log the sync run
  await addDoc(collection(db, COLLECTIONS.syncLog), {
    ...result,
    timestamp: serverTimestamp(),
  });

  return result;
}
