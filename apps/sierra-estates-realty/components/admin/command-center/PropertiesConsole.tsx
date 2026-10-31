'use client';

/**
 * SIERRA ESTATES — INVENTORY & FRESHNESS CONTROL (/admin/properties)
 *
 * The command center's listing console over public.listings:
 *   · bucket navigation (all / verified / stale / sold / pending) and search;
 *   · the verified / stale / sold lifecycle toggles, which ride the PRODUCTION
 *     state machine (publish_status gate, stale BOOLEAN, guarded status
 *     transitions — see /api/admin/properties/[id]);
 *   · se_code inspection and editing (uniqueness enforced by the partial
 *     unique index; duplicates surface as inline 409s, never 500s);
 *   · freshness_score per row (target ≥ 90%) with a bulk recompute that
 *     executes the public.refresh_all_listing_freshness() RPC (Curator).
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Gem,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  CcButton,
  CcCard,
  CcEmpty,
  CcError,
  CcKpi,
  CcPageShell,
  CcPill,
  CcRealtimeBadge,
  CcSpinner,
  CcUnauthorized,
  formatCurrency,
  mutateApi,
  timeAgo,
  useAdminApi,
} from '@/components/admin/command-center/ui';

interface PropertyRow {
  id: string;
  seCode: string | null;
  code: string | null;
  referenceCode: string | null;
  title: string;
  compound: string | null;
  developer: string | null;
  propertyType: string | null;
  dealType: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  status: string | null;
  publishStatus: string | null;
  verified: boolean | null;
  stale: boolean | null;
  freshnessScore: number | null;
  agent: string | null;
  tag: string | null;
  updatedAt: string | null;
  bucket: string;
}

interface PropertiesResponse {
  rows: PropertyRow[];
  summary: {
    counts: Record<string, number>;
    avgFreshness: number;
    freshOver90: number;
    compounds: string[];
    windowSize: number;
  };
}

type Bucket = 'all' | 'verified' | 'stale' | 'sold' | 'pending';

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'stale', label: 'Stale' },
  { id: 'sold', label: 'Sold' },
  { id: 'pending', label: 'Pending' },
];

function freshnessPill(score: number | null) {
  if (score === null || score === undefined) return <CcPill tone="neutral">—</CcPill>;
  return (
    <CcPill tone={score >= 90 ? 'green' : score >= 60 ? 'amber' : 'red'}>
      {score}%
    </CcPill>
  );
}

export default function PropertiesConsole() {
  const [bucket, setBucket] = useState<Bucket>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [editRow, setEditRow] = useState<PropertyRow | null>(null);
  const [seCodeDraft, setSeCodeDraft] = useState('');

  // Debounce the search box into the query string.
  useEffect(() => {
    const id = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ bucket, limit: '300' });
    if (search) params.set('q', search);
    return `/api/admin/properties?${params.toString()}`;
  }, [bucket, search]);

  const { data, loading, error, unauthorized, reload } = useAdminApi<PropertiesResponse>(url);

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  async function act(row: PropertyRow, action: 'verify' | 'mark-stale' | 'restore' | 'mark-sold') {
    setBusyId(row.id);
    setNotice(null);
    const res = await mutateApi(`/api/admin/properties/${row.id}`, 'PATCH', { action });
    setBusyId(null);
    if (res.ok) {
      setNotice({
        tone: 'ok',
        text: `${row.seCode ?? row.code ?? row.title}: ${action.replace(/-/g, ' ')} applied.`,
      });
      reload();
    } else {
      setNotice({ tone: 'err', text: String(res.body.error ?? `Action ${action} failed.`) });
    }
  }

  async function recomputeFreshness() {
    setRecomputing(true);
    setNotice(null);
    const res = await mutateApi('/api/admin/properties/refresh-freshness', 'POST');
    setRecomputing(false);
    if (res.ok) {
      const stats = res.body.stats as
        | { refreshed: number; avgFreshness: number; freshOver90: number; staleFlagged: number }
        | undefined;
      setNotice({
        tone: 'ok',
        text: `Curator recompute: ${stats?.refreshed ?? 0} refreshed · ${stats?.staleFlagged ?? 0} flagged stale · avg ${stats?.avgFreshness ?? 0}%`,
      });
      reload();
    } else {
      setNotice({ tone: 'err', text: String(res.body.error ?? 'Freshness recompute failed.') });
    }
  }

  async function saveSeCode() {
    if (!editRow) return;
    setBusyId(editRow.id);
    const res = await mutateApi(`/api/admin/properties/${editRow.id}`, 'PATCH', {
      seCode: seCodeDraft.trim(),
    });
    setBusyId(null);
    if (res.ok) {
      setEditRow(null);
      setNotice({ tone: 'ok', text: `se_code saved: ${seCodeDraft.trim()}` });
      reload();
    } else {
      setNotice({ tone: 'err', text: String(res.body.error ?? 'se_code save failed.') });
    }
  }

  if (unauthorized) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="Inventory & Freshness">
        <CcUnauthorized />
      </CcPageShell>
    );
  }

  return (
    <CcPageShell
      eyebrow="Sierra Estates · Unified Admin Command Center"
      title="Inventory & Freshness Control"
      subtitle="The verified / stale / sold lifecycle over public.listings — publish gate, se_code uniqueness and the 90% freshness discipline in one console."
      actions={
        <>
          <CcRealtimeBadge connected={!error && !loading} />
          <CcButton variant="gold" onClick={recomputeFreshness} loading={recomputing}>
            <Sparkles className="h-4 w-4" aria-hidden /> Recompute Freshness
          </CcButton>
          <Link href="/admin" className="cc-btn cc-btn-ghost no-underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Overview
          </Link>
        </>
      }
    >
      {error && !data ? (
        <CcError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <CcSpinner label="Loading inventory" />
      ) : !summary ? null : (
        <>
          {/* ── KPI strip ─────────────────────────────────────────────────── */}
          <section aria-label="Inventory summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CcKpi
              label="Verified (live)"
              value={String(summary.counts.verified ?? 0)}
              sub="PUBLISHABLE & non-stale — the public gate"
              icon={<BadgeCheck className="h-5 w-5" />}
              tone="green"
            />
            <CcKpi
              label="Stale"
              value={String(summary.counts.stale ?? 0)}
              sub="Flagged by the 30-day SLA or by hand"
              icon={<RefreshCw className="h-5 w-5" />}
              tone="neutral"
            />
            <CcKpi
              label="Sold"
              value={String(summary.counts.sold ?? 0)}
              sub="Terminal — audited into status_history"
              icon={<Gem className="h-5 w-5" />}
              tone="gold"
            />
            <CcKpi
              label="Avg Freshness"
              value={`${summary.avgFreshness}%`}
              sub={`${summary.freshOver90} listings ≥ 90% in window`}
              icon={<Sparkles className="h-5 w-5" />}
              tone={summary.avgFreshness >= 90 ? 'green' : 'gold'}
              progress={summary.avgFreshness}
            />
            <CcKpi
              label="Window"
              value={String(summary.windowSize)}
              sub={`${summary.counts.pending ?? 0} pending verification`}
              icon={<Tag className="h-5 w-5" />}
              tone="azure"
            />
          </section>

          {/* ── Filters ───────────────────────────────────────────────────── */}
          <CcCard className="mt-6 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f5f3ec]/30" aria-hidden />
                <input
                  className="cc-input pl-9"
                  placeholder="Search title, compound, se_code, agent…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search inventory"
                />
              </div>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Status buckets">
                {BUCKETS.map((b) => (
                  <button
                    key={b.id}
                    role="tab"
                    aria-selected={bucket === b.id}
                    onClick={() => setBucket(b.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      bucket === b.id
                        ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                        : 'border-white/10 bg-white/[0.03] text-[#f5f3ec]/55 hover:border-white/25'
                    }`}
                  >
                    {b.label}
                    <span className="cc-num ml-1.5 opacity-60">
                      {b.id === 'all' ? summary.windowSize : summary.counts[b.id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CcCard>

          {notice && (
            <div
              className={`mt-4 rounded-xl border px-4 py-2.5 text-xs ${
                notice.tone === 'ok'
                  ? 'border-emerald-soft/40 bg-emerald-soft/10 text-emerald-soft'
                  : 'border-ruby-soft/40 bg-ruby-soft/10 text-[#ff8b95]'
              }`}
              role="status"
            >
              {notice.text}
            </div>
          )}

          {/* ── Inventory table ───────────────────────────────────────────── */}
          <CcCard className="mt-4 overflow-hidden">
            <div className="cc-scroll max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#0a192f]/95 backdrop-blur">
                  <tr className="text-[0.64rem] uppercase tracking-[0.14em] text-[#f5f3ec]/40">
                    <th className="px-4 py-3 font-semibold">SE Code</th>
                    <th className="px-4 py-3 font-semibold">Property</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Freshness</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Lifecycle</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-white/[0.05] transition-colors hover:bg-white/[0.02] ${
                        busyId === row.id ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setEditRow(row);
                            setSeCodeDraft(row.seCode ?? row.code ?? '');
                          }}
                          className="cc-num rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[0.7rem] text-gold-300 transition hover:border-gold-500/50"
                          title="Edit the canonical SE code (uniqueness enforced)"
                        >
                          {row.seCode ?? row.code ?? 'set code'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[280px] truncate font-medium text-[#f5f3ec]/90">
                          {row.title || row.compound || 'Untitled'}
                        </p>
                        <p className="mt-0.5 text-[0.66rem] text-[#f5f3ec]/40">
                          {[row.compound, row.propertyType, `${row.bedrooms ?? '—'} bed`, row.areaSqm ? `${row.areaSqm} sqm` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </td>
                      <td className="cc-num px-4 py-3 text-[#f5f3ec]/85">
                        {formatCurrency(row.price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <CcPill
                            tone={
                              row.bucket === 'verified'
                                ? 'green'
                                : row.bucket === 'stale'
                                  ? 'amber'
                                  : row.bucket === 'sold'
                                    ? 'red'
                                    : 'neutral'
                            }
                          >
                            {row.bucket}
                          </CcPill>
                          <span className="text-[0.6rem] text-[#f5f3ec]/35">
                            {row.status} · {row.publishStatus ?? 'unclassified'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{freshnessPill(row.freshnessScore)}</td>
                      <td className="px-4 py-3 text-[0.7rem] text-[#f5f3ec]/50">
                        {timeAgo(row.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {row.bucket !== 'verified' && row.bucket !== 'sold' && (
                            <CcButton variant="gold" onClick={() => act(row, 'verify')} disabled={busyId === row.id}>
                              Verify
                            </CcButton>
                          )}
                          {row.bucket === 'stale' && (
                            <CcButton variant="ghost" onClick={() => act(row, 'restore')} disabled={busyId === row.id}>
                              Restore
                            </CcButton>
                          )}
                          {row.bucket !== 'stale' && row.bucket !== 'sold' && (
                            <CcButton variant="ghost" onClick={() => act(row, 'mark-stale')} disabled={busyId === row.id}>
                              Stale
                            </CcButton>
                          )}
                          {row.bucket !== 'sold' && (
                            <CcButton variant="danger" onClick={() => act(row, 'mark-sold')} disabled={busyId === row.id}>
                              Sold
                            </CcButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <CcEmpty
                          title="No listings in this bucket"
                          hint="Adjust the filters, or ingest inventory through the Scribe workflow on the bot desk."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CcCard>

          <p className="mt-3 text-[0.66rem] text-[#f5f3ec]/30">
            Lifecycle writes respect the DB state machine (migrations 011/035) — every transition is
            audited into status_history. The public showcase reads verified rows with
            freshness ≥ 90%.
          </p>
        </>
      )}

      {/* ── se_code editor ────────────────────────────────────────────────── */}
      {editRow && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#05080f]/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Edit SE code"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditRow(null);
          }}
        >
          <div className="cc-glass-raised w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-[#f5f3ec]">Canonical SE code</h2>
            <p className="mt-1 text-xs text-[#f5f3ec]/50">
              {editRow.title || editRow.compound} — the unique Sierra Estates inventory code
              (partial unique index, migration 037).
            </p>
            <input
              className="cc-input cc-num mt-4"
              value={seCodeDraft}
              onChange={(e) => setSeCodeDraft(e.target.value)}
              placeholder="SE-SUB-123456"
              aria-label="SE code value"
            />
            <div className="mt-5 flex justify-end gap-2">
              <CcButton variant="ghost" onClick={() => setEditRow(null)}>
                Cancel
              </CcButton>
              <CcButton
                variant="gold"
                onClick={saveSeCode}
                disabled={!seCodeDraft.trim() || busyId === editRow.id}
                loading={busyId === editRow.id}
              >
                Save code
              </CcButton>
            </div>
          </div>
        </div>
      )}
    </CcPageShell>
  );
}
