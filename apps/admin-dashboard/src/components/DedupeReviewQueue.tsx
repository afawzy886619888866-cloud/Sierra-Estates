"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

interface SyncRecord {
  id: string;
  pfReferenceNumber: string;
  firestoreDocId: string | null;
  status: 'ambiguous' | 'conflict' | 'resolved' | 'skipped';
  matchConfidence: number;
  pfData: Record<string, unknown>;
  firestoreData?: Record<string, unknown>;
  conflictFields?: string[];
}

export default function DedupeReviewQueue() {
  const user = auth.currentUser;
  const [items, setItems] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await user?.getIdToken();
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    return fetch(url, { ...options, headers });
  }, [user]);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/sync?action=pending-reviews');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch dedup queue:', err);
      toast.error('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => { 
    if (user) fetchPending(); 
  }, [fetchPending, user]);

  const handleRunSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetchWithAuth('/api/sync?action=run-sync', {
        method: 'POST',
        body: JSON.stringify({ filters: {} }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Sync failed');
      }

      const data = await res.json();
      setSyncResult(data);
      toast.success('Synchronization complete');
      await fetchPending(); // Refresh the queue
    } catch (err: any) {
      console.error('Sync failed:', err);
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleResolve = async (queueId: string, resolution: 'matched' | 'skipped' | 'new', firestoreDocId?: string) => {
    try {
      const res = await fetchWithAuth('/api/sync?action=resolve', {
        method: 'POST',
        body: JSON.stringify({
          queueId,
          resolution,
          resolvedBy: user?.email || 'admin',
          firestoreDocId,
        }),
      });

      if (!res.ok) throw new Error('Resolution failed');

      toast.success(`Item ${resolution === 'matched' ? 'merged' : resolution === 'new' ? 'created' : 'skipped'} successfully`);
      setItems(prev => prev.filter(item => item.id !== queueId));
    } catch (err) {
      console.error('Failed to resolve:', err);
      toast.error('Failed to resolve item');
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return { label: 'High', className: 'dedup-badge dedup-badge--high' };
    if (confidence >= 50) return { label: 'Medium', className: 'dedup-badge dedup-badge--medium' };
    return { label: 'Low', className: 'dedup-badge dedup-badge--low' };
  };

  return (
    <div className="dedup-container">
      {/* Header */}
      <div className="dedup-header">
        <div>
          <h2 className="dedup-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 16v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1" />
              <rect x="9" y="3" width="13" height="13" rx="2" />
            </svg>
            Sync &amp; Dedup Review
          </h2>
          <p className="dedup-subtitle">
            Property Finder ↔ Firestore synchronization management
          </p>
        </div>

        <button
          className="dedup-sync-btn"
          onClick={handleRunSync}
          disabled={syncing}
          id="btn-run-sync"
        >
          {syncing ? (
            <>
              <span className="dedup-spinner" />
              Syncing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Run Sync
            </>
          )}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="dedup-result">
          <h3>Last Sync Result</h3>
          <div className="dedup-result-grid">
            <div className="dedup-stat">
              <span className="dedup-stat-value">{String(syncResult.total ?? 0)}</span>
              <span className="dedup-stat-label">Total</span>
            </div>
            <div className="dedup-stat dedup-stat--success">
              <span className="dedup-stat-value">{String(syncResult.matched ?? 0)}</span>
              <span className="dedup-stat-label">Matched</span>
            </div>
            <div className="dedup-stat dedup-stat--info">
              <span className="dedup-stat-value">{String(syncResult.created ?? 0)}</span>
              <span className="dedup-stat-label">Created</span>
            </div>
            <div className="dedup-stat dedup-stat--warning">
              <span className="dedup-stat-value">{String(syncResult.dedupeQueue ?? 0)}</span>
              <span className="dedup-stat-label">Need Review</span>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="dedup-queue">
        <div className="dedup-queue-header">
          <h3>Pending Review ({items.length})</h3>
        </div>

        {loading ? (
          <div className="dedup-loading">
            <span className="dedup-spinner" />
            Loading queue...
          </div>
        ) : items.length === 0 ? (
          <div className="dedup-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <p>All clear — no items pending review</p>
          </div>
        ) : (
          <div className="dedup-items">
            {items.map(item => {
              const badge = getConfidenceBadge(item.matchConfidence);
              const isExpanded = expandedId === item.id;

              return (
                <div key={item.id} className="dedup-item" data-status={item.status}>
                  <div className="dedup-item-header" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                    <div className="dedup-item-info">
                      <span className="dedup-item-ref">
                        Ref: {item.pfReferenceNumber || 'N/A'}
                      </span>
                      <span className={badge.className}>
                        {item.matchConfidence}% — {badge.label}
                      </span>
                      <span className="dedup-item-status">
                        {item.status === 'conflict' ? '⚠️ Conflict' : '🔍 Ambiguous'}
                      </span>
                    </div>
                    <svg 
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`dedup-chevron ${isExpanded ? 'dedup-chevron--open' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {isExpanded && (
                    <div className="dedup-item-detail">
                      {/* Side-by-side comparison */}
                      <div className="dedup-comparison">
                        <div className="dedup-compare-col">
                          <h4>Property Finder Data</h4>
                          <div className="dedup-data-card">
                            <p><strong>Title:</strong> {String(item.pfData.title || 'N/A')}</p>
                            <p><strong>Price:</strong> {String(item.pfData.price || 'N/A')}</p>
                            <p><strong>Location:</strong> {String(item.pfData.compound || item.pfData.location || 'N/A')}</p>
                            <p><strong>Area:</strong> {String(item.pfData.area || 'N/A')} sqm</p>
                          </div>
                        </div>
                        <div className="dedup-compare-col">
                          <h4>Firestore Data</h4>
                          <div className="dedup-data-card">
                            {item.firestoreData ? (
                              <>
                                <p><strong>Title:</strong> {String(item.firestoreData.title || 'N/A')}</p>
                                <p><strong>Price:</strong> {String(item.firestoreData.price || 'N/A')}</p>
                                <p><strong>Location:</strong> {String(item.firestoreData.compound || item.firestoreData.location || 'N/A')}</p>
                                <p><strong>Area:</strong> {String(item.firestoreData.area || 'N/A')} sqm</p>
                              </>
                            ) : (
                              <p>No existing match</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conflict fields */}
                      {item.conflictFields && item.conflictFields.length > 0 && (
                        <div className="dedup-conflicts">
                          <h4>🛡️ Protected Fields (manual edits)</h4>
                          <div className="dedup-conflict-tags">
                            {item.conflictFields.map(field => (
                              <span key={field} className="dedup-conflict-tag">{field}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="dedup-actions">
                        <button
                          className="dedup-action-btn dedup-action-btn--approve"
                          onClick={() => handleResolve(item.id, 'matched', item.firestoreDocId || undefined)}
                          id={`btn-approve-${item.id}`}
                        >
                          ✅ Approve Match
                        </button>
                        <button
                          className="dedup-action-btn dedup-action-btn--new"
                          onClick={() => handleResolve(item.id, 'new')}
                          id={`btn-new-${item.id}`}
                        >
                          ➕ Create as New
                        </button>
                        <button
                          className="dedup-action-btn dedup-action-btn--skip"
                          onClick={() => handleResolve(item.id, 'skipped')}
                          id={`btn-skip-${item.id}`}
                        >
                          ⏭️ Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .dedup-container {
          padding: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .dedup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .dedup-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--heading-font, 'Playfair Display', serif);
          font-size: 1.5rem;
          color: var(--text-primary);
          margin: 0;
        }
        .dedup-subtitle {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin: 0.25rem 0 0;
        }
        .dedup-sync-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: var(--gold, #C9A84C);
          color: var(--bg-primary, #0D1B2A);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dedup-sync-btn:hover:not(:disabled) {
          background: var(--gold-light, #D4B85C);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(201, 168, 76, 0.3);
        }
        .dedup-sync-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .dedup-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: dedup-spin 0.6s linear infinite;
        }
        @keyframes dedup-spin {
          to { transform: rotate(360deg); }
        }
        .dedup-result {
          background: var(--glass-bg, rgba(255,255,255,0.05));
          border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(8px);
        }
        .dedup-result h3 {
          font-family: var(--heading-font, 'Playfair Display', serif);
          margin: 0 0 1rem;
          color: var(--text-primary);
        }
        .dedup-result-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        .dedup-stat {
          text-align: center;
          padding: 0.75rem;
          background: var(--glass-bg, rgba(255,255,255,0.03));
          border-radius: 8px;
          border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
        }
        .dedup-stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .dedup-stat--success .dedup-stat-value { color: #4ade80; }
        .dedup-stat--info .dedup-stat-value { color: #60a5fa; }
        .dedup-stat--warning .dedup-stat-value { color: var(--gold, #C9A84C); }
        .dedup-stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .dedup-queue {
          background: var(--glass-bg, rgba(255,255,255,0.05));
          border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
          border-radius: 12px;
          overflow: hidden;
        }
        .dedup-queue-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.08));
        }
        .dedup-queue-header h3 {
          margin: 0;
          font-family: var(--heading-font, 'Playfair Display', serif);
          color: var(--text-primary);
        }
        .dedup-loading, .dedup-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
          color: var(--text-secondary);
        }
        .dedup-item {
          border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.06));
          transition: background 0.2s;
        }
        .dedup-item:last-child { border-bottom: none; }
        .dedup-item:hover { background: rgba(255,255,255,0.02); }
        .dedup-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          cursor: pointer;
        }
        .dedup-item-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .dedup-item-ref {
          font-weight: 600;
          color: var(--text-primary);
          font-family: monospace;
        }
        .dedup-badge {
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .dedup-badge--high { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .dedup-badge--medium { background: rgba(201, 168, 76, 0.15); color: var(--gold, #C9A84C); }
        .dedup-badge--low { background: rgba(248, 113, 113, 0.15); color: #f87171; }
        .dedup-item-status {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .dedup-chevron {
          transition: transform 0.2s;
          color: var(--text-secondary);
        }
        .dedup-chevron--open { transform: rotate(180deg); }
        .dedup-item-detail {
          padding: 0 1.25rem 1.25rem;
        }
        .dedup-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        @media (max-width: 640px) {
          .dedup-comparison { grid-template-columns: 1fr; }
        }
        .dedup-compare-col h4 {
          font-size: 0.8rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin: 0 0 0.5rem;
          letter-spacing: 0.05em;
        }
        .dedup-data-card {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 0.75rem;
          font-size: 0.85rem;
        }
        .dedup-data-card p {
          margin: 0.3rem 0;
          color: var(--text-primary);
        }
        .dedup-conflicts {
          margin-bottom: 1rem;
        }
        .dedup-conflicts h4 {
          font-size: 0.85rem;
          margin: 0 0 0.5rem;
          color: var(--gold);
        }
        .dedup-conflict-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .dedup-conflict-tag {
          padding: 0.2rem 0.6rem;
          background: rgba(201, 168, 76, 0.1);
          border: 1px solid rgba(201, 168, 76, 0.3);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--gold);
          font-family: monospace;
        }
        .dedup-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .dedup-action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dedup-action-btn:hover { transform: translateY(-1px); }
        .dedup-action-btn--approve {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
        }
        .dedup-action-btn--approve:hover {
          background: rgba(74, 222, 128, 0.25);
        }
        .dedup-action-btn--new {
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
        }
        .dedup-action-btn--new:hover {
          background: rgba(96, 165, 250, 0.25);
        }
        .dedup-action-btn--skip {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }
        .dedup-action-btn--skip:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
