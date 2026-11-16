'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface ProbedPhoto {
  url: string;
  reachable: boolean;
  httpStatus: number | null;
  width: number | null;
  height: number | null;
  format: string;
  byteSize: number | null;
  meetsMinDimensions: boolean;
  qualifying: boolean;
  issue: string | null;
}

interface ApprovalCandidate {
  id: string;
  code: string;
  title: string | null;
  titleAr: string | null;
  description: string | null;
  compound: string | null;
  locationArea: string | null;
  city: string | null;
  pfLocationId: number | null;
  propertyType: string | null;
  dealType: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  status: string | null;
  publishStatus: string | null;
  syncSource: string | null;
  hasOwnerPhone: boolean;
  totalPhotos: number;
  qualifyingPhotos: number;
  requiredPhotos: number;
  missingPhotos: number;
  minWidthPx: number;
  minHeightPx: number;
  readyForPfApproval: boolean;
  photos: ProbedPhoto[];
  blockers: string[];
}

export default function PropertyFinderVisualApprovalPage() {
  const [candidates, setCandidates] = useState<ApprovalCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pf-approval?limit=24', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const handleUploadPhotos = async (candidate: ApprovalCandidate, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusyId(candidate.id);
    setToast(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('code', candidate.code);
        fd.append('file', file);
        const res = await fetch('/api/admin/listings/photos', {
          method: 'POST',
          body: fd,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Upload failed (${res.status})`);
        }
      }
      setToast({
        kind: 'ok',
        text: `Uploaded ${files.length} photo(s) to ${candidate.code}. Re-verifying resolution & 6-photo gate…`,
      });
      await loadCandidates();
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Photo upload failed' });
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestOwnerPhotos = async (candidate: ApprovalCandidate) => {
    setBusyId(candidate.id);
    setToast(null);
    try {
      const res = await fetch('/api/admin/pf-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_owner_photos', listingId: candidate.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setToast({
        kind: 'ok',
        text: `Queued 6-photo (>=800×600px) WhatsApp request to owner of ${candidate.code}.`,
      });
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveAndPublish = async (candidate: ApprovalCandidate, dryRun: boolean) => {
    setBusyId(candidate.id);
    setToast(null);
    try {
      const res = await fetch('/api/admin/pf-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_and_publish',
          listingId: candidate.id,
          dryRun,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setToast({
        kind: 'ok',
        text: dryRun
          ? `Dry-run passed for ${candidate.code}: all 6+ photos & OpenAPI 3.1.0 schema verified!`
          : `Published ${candidate.code} live to Property Finder Atlas!`,
      });
      await loadCandidates();
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Publish failed' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-800 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-amber-400/90 font-medium">
              Sierra Estates · Property Finder Enterprise (OpenAPI 3.1.0)
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-white mt-1">
              Visual Ad Approval Studio — 6-Photo &amp; Resolution Gate
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Every Property Finder ad requires at least <strong className="text-stone-200">6 genuine photos</strong>{' '}
              with minimum resolution <strong className="text-stone-200">800 × 600 px</strong>. Inspect actual unit
              photos &amp; specs below before approving.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadCandidates()}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? 'Probing Photos…' : 'Refresh & Re-Probe'}
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-stone-700 hover:border-stone-500 text-sm text-stone-300 transition"
            >
              ← Back to Admin Portal
            </Link>
          </div>
        </header>

        {toast && (
          <div
            className={`rounded-xl px-4 py-3 text-sm border ${
              toast.kind === 'ok'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                : 'bg-rose-950/60 border-rose-700 text-rose-200'
            }`}
          >
            {toast.text}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-950/60 border border-rose-800 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-stone-900/70 border border-stone-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {candidates.map((unit) => {
              const progressPct = Math.min(100, Math.round((unit.qualifyingPhotos / unit.requiredPhotos) * 100));
              const isBusy = busyId === unit.id;

              return (
                <section
                  key={unit.id}
                  className="rounded-2xl bg-stone-900/80 border border-stone-800 overflow-hidden shadow-xl"
                >
                  <div className="p-6 border-b border-stone-800/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-xs font-mono font-semibold">
                          {unit.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 text-xs">
                          {unit.compound || unit.locationArea || unit.city || 'Unmapped Location'}
                          {unit.pfLocationId ? ` · PF Loc #${unit.pfLocationId}` : ' · No PF ID'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 text-xs uppercase">
                          {unit.propertyType || '—'} · {unit.dealType || 'sale'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${
                            unit.readyForPfApproval
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-700/60'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-700/50'
                          }`}
                        >
                          {unit.qualifyingPhotos} / {unit.requiredPhotos} Valid Photos (&ge;{unit.minWidthPx}&times;
                          {unit.minHeightPx}px)
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        {unit.title || `${unit.propertyType || 'Unit'} — ${unit.compound || unit.code}`}
                      </h2>
                      {unit.titleAr && <p className="text-sm text-stone-400 dir-rtl">{unit.titleAr}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-5 text-sm">
                      <div>
                        <span className="text-stone-400 block text-xs">Price</span>
                        <strong className="text-base text-amber-300">
                          {unit.price ? `${unit.currency} ${Number(unit.price).toLocaleString()}` : '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-xs">Area</span>
                        <strong className="text-white">{unit.areaSqm ? `${unit.areaSqm} m²` : '—'}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-xs">Layout</span>
                        <strong className="text-white">
                          {unit.bedrooms ?? '—'} BR / {unit.bathrooms ?? '—'} BA
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar + blockers */}
                  <div className="px-6 pt-4">
                    <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          unit.readyForPfApproval ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    {unit.blockers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {unit.blockers.map((b, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-md bg-stone-800/90 text-amber-200/90 border border-stone-700"
                          >
                            ⚠ {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visual Photo Grid */}
                  <div className="p-6">
                    {unit.photos.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-700 p-8 text-center text-sm text-stone-400">
                        No photos attached yet — requires 6 photos (&ge;800&times;600 px) before Property Finder publish.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {unit.photos.map((photo, idx) => (
                          <div
                            key={`${photo.url}-${idx}`}
                            className={`group relative rounded-xl overflow-hidden border bg-stone-950 ${
                              photo.qualifying ? 'border-emerald-700/60' : 'border-rose-700/80'
                            }`}
                          >
                            {photo.reachable ? (
                              <button
                                type="button"
                                onClick={() => setLightboxUrl(photo.url)}
                                className="block w-full aspect-[4/3] overflow-hidden focus:outline-none"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.url}
                                  alt={`${unit.code} photo ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <div className="w-full aspect-[4/3] flex items-center justify-center bg-rose-950/30 text-xs text-rose-300 px-2 text-center">
                                Unreachable (HTTP {photo.httpStatus ?? 'ERR'})
                              </div>
                            )}
                            <div className="px-2.5 py-1.5 text-[11px] flex items-center justify-between bg-stone-900/95 border-t border-stone-800">
                              <span className="font-mono text-stone-300">
                                {photo.width && photo.height ? `${photo.width}×${photo.height}` : 'No dims'}
                              </span>
                              <span
                                className={`font-semibold ${
                                  photo.qualifying ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {photo.qualifying ? 'PASS ✓' : 'REJECT ✗'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {unit.description && (
                      <p className="mt-4 text-xs text-stone-400 line-clamp-2">{unit.description}</p>
                    )}

                    {/* Action Bar */}
                    <div className="mt-5 pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 transition">
                          + Upload Photos (&ge;800&times;600)
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            disabled={isBusy}
                            onChange={(e) => void handleUploadPhotos(unit, e.target.files)}
                            className="hidden"
                          />
                        </label>

                        {unit.hasOwnerPhone && unit.missingPhotos > 0 && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleRequestOwnerPhotos(unit)}
                            className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-amber-300 transition disabled:opacity-50"
                          >
                            Request {unit.missingPhotos} Missing Photo(s) via WhatsApp
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled={isBusy || !unit.readyForPfApproval}
                          onClick={() => void handleApproveAndPublish(unit, true)}
                          className="px-4 py-2 rounded-lg border border-emerald-700/70 text-emerald-300 hover:bg-emerald-950/50 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Validate Dry-Run (6+ Photos)
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || !unit.readyForPfApproval}
                          onClick={() => void handleApproveAndPublish(unit, false)}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {unit.readyForPfApproval
                            ? 'Approve & Publish to Property Finder'
                            : `Locked (${unit.qualifyingPhotos}/6 Valid Photos)`}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full resolution preview"
            className="max-w-full max-h-full rounded-xl shadow-2xl border border-stone-700"
          />
        </div>
      )}
    </main>
  );
}
