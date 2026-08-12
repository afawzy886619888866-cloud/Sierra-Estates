/**
 * Sierra Estates OS Search Relevance Engine
 * Tracks user accesses/interactions with leads, listings, agents, and workflows
 * and ranks them dynamically using a combined frequency-recency decay algorithm.
 */

export interface AccessRecord {
  id: string;
  type: 'leads' | 'listings' | 'agents' | 'workflows';
  count: number;
  lastAccessed: number; // UNIX timestamp ms
}

const STORAGE_KEY = 'sierra_relevance_access_records_v1';

/**
 * Retrieves all access records from local storage.
 */
export function getAllAccessRecords(): Record<string, AccessRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse access records:', e);
    return {};
  }
}

/**
 * Saves all access records to local storage.
 */
function saveAccessRecords(records: Record<string, AccessRecord>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    // Dispatch custom event to notify all components to re-render or re-score
    window.dispatchEvent(new CustomEvent('sierra_access_updated', { detail: records }));
  } catch (e) {
    console.error('Failed to save access records:', e);
  }
}

/**
 * Records an access/interaction event for a given item.
 */
export function recordAccess(id: string, type: 'leads' | 'listings' | 'agents' | 'workflows') {
  if (!id) return;
  const records = getAllAccessRecords();
  const existing = records[id];

  const count = existing ? existing.count + 1 : 1;
  const lastAccessed = Date.now();

  records[id] = {
    id,
    type,
    count,
    lastAccessed,
  };

  saveAccessRecords(records);
}

/**
 * Computes the dynamic relevance score for an item.
 * Base score from frequency of access + progressive half-life recency decay.
 */
export function getRelevanceScore(id: string): number {
  const records = getAllAccessRecords();
  const record = records[id];
  if (!record) return 0;

  const now = Date.now();
  const diffMs = now - record.lastAccessed;
  const diffHours = diffMs / (1000 * 60 * 60);

  // 1. Frequency Score: Each access adds 25 points
  const frequencyScore = record.count * 25;

  // 2. Recency Score: Max 150 points decaying smoothly over time (half-life of 18 hours)
  const recencyScore = 150 * Math.pow(0.5, diffHours / 18);

  // Return formatted/rounded to 1 decimal place
  return Math.round((frequencyScore + recencyScore) * 10) / 10;
}

/**
 * Sorts array of items based on their relevance score.
 * Pre-existing sorting criteria acts as secondary tie-breaker if relevance scores are equal.
 */
export function sortByRelevance<T extends { id: string }>(
  items: T[],
  secondarySort?: (a: T, b: T) => number
): T[] {
  return [...items].sort((a, b) => {
    const scoreA = getRelevanceScore(a.id);
    const scoreB = getRelevanceScore(b.id);

    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Descending by relevance score
    }

    if (secondarySort) {
      return secondarySort(a, b);
    }
    return 0;
  });
}
