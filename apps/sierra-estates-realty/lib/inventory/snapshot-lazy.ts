import 'server-only';

/**
 * LAZY INVENTORY SNAPSHOT LOADER (production-smoke fix, 2026-11-20)
 * ─────────────────────────────────────────────────────────────────
 * `lib/inventory/snapshot.json` is a ~6.7 MB catalog. Every module that
 * imported it STATICALLY paid the parse/allocation cost during Worker
 * module instantiation — on cold Cloudflare isolates that pushed
 * /sitemap.xml, /property/[id] and the check-availability-sla cron over
 * the startup budget: intermittent 500s / Cloudflare error 1101 exactly
 * as first seen by production-smoke (3 fails of 17) and the Automations
 * dispatcher (target `check-availability-sla` → 1101 while
 * `lead-timers` passed).
 *
 * Fix: dynamic `import()` on first use, cached promise afterwards. The
 * JSON stays bundled (no filesystem access needed on workers) but is
 * only instantiated when a route actually needs it — and inside that
 * route's own error handling, so a failure degrades gracefully instead
 * of killing the isolate before the route runs.
 */

let cachedPromise: Promise<any[]> | null = null;

/** All units from the committed snapshot — resolved lazily, then cached. */
export async function loadSnapshotUnits(): Promise<any[]> {
  if (!cachedPromise) {
    cachedPromise = import('@/lib/inventory/snapshot.json')
      .then((mod) => {
        const snap = (mod as { default?: { units?: unknown[] } }).default;
        return Array.isArray(snap?.units) ? (snap!.units as any[]) : [];
      })
      .catch((err) => {
        // Do NOT cache the failure — the next caller retries. Degrade to
        // an empty catalog; every consumer must already handle [].
        console.error('[snapshot-lazy] snapshot load failed:', (err as Error).message);
        cachedPromise = null;
        return [] as any[];
      });
  }
  return cachedPromise;
}
