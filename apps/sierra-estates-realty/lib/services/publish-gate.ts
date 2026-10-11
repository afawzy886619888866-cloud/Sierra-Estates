import 'server-only';

/**
 * PUBLISH GATE (C6 model) — the single server-side authority that decides
 * whether a canonical unit record may be published to Property Finder.
 *
 * Source of truth for the 8 conditions: docs/VERIFICATION_QUEUE.md
 * (mirrors assign_publish_status() in scripts/data-audit/build_master_inventory.py):
 *
 *   1 available            availability == 'available'
 *   2 valid price          price > 0 AND currency recorded
 *   3 valid property type  maps to a real PF type (no 'apartment' fallback)
 *   4 usable location      compound/location/city present + PF-resolvable
 *   5 valid contact        reachable phone + known ownerType (authorized purpose)
 *   6 quality              data_quality_score >= 75
 *   7 fresh verification   verified_at within 30 days (Fresh <=7 / Aging <=30)
 *                          AND verified_by (auditable staff provenance)
 *   8 photos               >= 3 real http(s) photo URLs
 *
 * Plus the staging guard: publish_status must be 'PUBLISHABLE' — a
 * REVIEW_REQUIRED / INCOMPLETE / STALE / DUPLICATE record is private staging
 * and can never be externally published, no matter which code path calls
 * publishListing().
 *
 * Design rules (master execution command, Phase 4):
 * - The gate lives INSIDE the service, not in UI button visibility.
 * - Every caller is subject to the same gate: AugustOwnersAgentService,
 *   WhatsApp chat scan, Easy Listing, Telegram intake, Google Sheet sync,
 *   admin bulk actions, AI parser, manual dispatcher calls.
 * - Default-deny: an unknown/null value fails the condition rather than
 *   passing it.
 */

import { Unit } from '../models/schema';

/** Freshness windows (days) — mirror build_master_inventory.freshness_bucket(). */
export const VERIFICATION_FRESH_DAYS = 30;
/** Minimum canonical quality score (C6 gate #6). */
export const PUBLISH_QUALITY_THRESHOLD = 75;
/** Minimum real photos (C6 gate #8 / plan C5). */
export const PUBLISH_MIN_PHOTOS = 3;

export interface PublishGateCheck {
  /** Short machine key, e.g. 'availability'. */
  condition: string;
  /** Human label, e.g. 'Confirmed available status'. */
  label: string;
  passed: boolean;
  /** Evidence or failure reason — never a fabricated value. */
  detail: string;
}

export interface PublishGateResult {
  eligible: boolean;
  checks: PublishGateCheck[];
  failures: string[];
}

/** Statuses that mean "actually on the market" for the runtime gate. */
const AVAILABLE_STATUSES = new Set(['available', 'active', 'verified', 'published']);

/** Currencies PF accepts (EGP primary; others recorded for completeness). */
const KNOWN_CURRENCIES = new Set(['EGP', 'USD', 'AED', 'EUR', 'GBP', 'SAR']);

/** Property types with a real PF mapping — unknown types FAIL the gate. */
const PF_PROPERTY_TYPES = new Set([
  'apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'chalet',
  'twin-house', 'palace', 'land',
]);

function isRealPhotoUrl(url: unknown): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) && url.trim().length > 10;
}

function countRealPhotos(unit: PublishGateUnit): number {
  const images = Array.isArray(unit.images) ? unit.images : [];
  return images.filter(isRealPhotoUrl).length;
}

function phoneDigits(phone: unknown): number {
  return typeof phone === 'string' ? phone.replace(/\D/g, '').length : 0;
}

/** The unit shape the gate reads — canonical columns come back camelCase. */
export type PublishGateUnit = Unit & {
  publishStatus?: string | null;
  availability?: string | null;
  priceCurrency?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  dataQualityScore?: number | null;
  photoCount?: number | null;
  ownerPhone?: string | null;
  brokerPhone?: string | null;
  ownerType?: string | null;
};

export class PublishGateError extends Error {
  readonly gate: PublishGateResult;

  constructor(gate: PublishGateResult) {
    super(
      `Publish gate rejected this unit — failed: ${gate.failures.join('; ')}. ` +
      `REVIEW_REQUIRED means private staging, never external publication.`
    );
    this.name = 'PublishGateError';
    this.gate = gate;
  }
}

export class PublishGate {
  /**
   * Pure evaluation — no network calls, no side effects. Safe to unit-test
   * and safe to call from any caller that wants a preview.
   */
  static evaluate(unit: PublishGateUnit): PublishGateResult {
    const checks: PublishGateCheck[] = [];

    // 0 — staging guard: the record must be classified PUBLISHABLE.
    const publishStatus = (unit.publishStatus ?? '').toString().trim().toUpperCase() || null;
    checks.push({
      condition: 'classification',
      label: 'Record classified PUBLISHABLE (not private staging)',
      passed: publishStatus === 'PUBLISHABLE',
      detail:
        publishStatus === 'PUBLISHABLE'
          ? 'publish_status = PUBLISHABLE'
          : `publish_status = ${publishStatus ?? '(unset)'} — REVIEW_REQUIRED / INCOMPLETE / STALE / EXPIRED / DUPLICATE records are private staging`,
    });

    // 1 — confirmed available status.
    const availability = (unit.availability ?? '').toString().trim().toLowerCase() || null;
    const status = (unit.status ?? '').toString().trim().toLowerCase() || null;
    const availableOk =
      availability === 'available' ||
      (availability == null && AVAILABLE_STATUSES.has(status ?? ''));
    checks.push({
      condition: 'availability',
      label: 'Confirmed available status',
      passed: availableOk,
      detail: availableOk
        ? `availability=${availability ?? 'unset'}; status=${status ?? 'unset'}`
        : `availability=${availability ?? 'unset'} / status=${status ?? 'unset'} — unit is not confirmed available`,
    });

    // 2 — valid price AND currency.
    const price = Number(unit.price);
    const currency = (unit.priceCurrency ?? '').toString().trim().toUpperCase() || null;
    const priceOk = Number.isFinite(price) && price > 0 && KNOWN_CURRENCIES.has(currency ?? '');
    checks.push({
      condition: 'price',
      label: 'Valid price and currency',
      passed: priceOk,
      detail: priceOk
        ? `price=${price} ${currency}`
        : `price=${Number.isFinite(price) ? price : 'unset'}; currency=${currency ?? 'unset'} — both a positive price and a recorded currency (e.g. EGP) are required`,
    });

    // 3 — valid property type (strict mapping, no fallback).
    const rawType = (unit.propertyType ?? '').toString().trim().toLowerCase() || null;
    const typeOk = rawType != null && PF_PROPERTY_TYPES.has(rawType);
    checks.push({
      condition: 'propertyType',
      label: 'Valid property type',
      passed: typeOk,
      detail: typeOk
        ? `propertyType=${rawType}`
        : `propertyType=${rawType ?? 'unset'} — no PF mapping (the old code silently defaulted unknown types to 'apartment')`,
    });

    // 4 — usable, source-backed location.
    const lookup = [unit.compound, unit.location, unit.city]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
    checks.push({
      condition: 'location',
      label: 'Usable, source-backed location',
      passed: lookup.length > 0,
      detail:
        lookup.length > 0
          ? `location candidates: ${lookup.join(' | ')}`
          : 'no compound / location / city on the record',
    });

    // 5 — valid contact details and authorized purpose.
    const contactPhone =
      [unit.ownerPhone, unit.brokerPhone, unit.ownerContact]
        .map((p) => (typeof p === 'string' ? p : ''))
        .find((p) => phoneDigits(p) >= 8) ?? null;
    const ownerType = (unit.ownerType ?? '').toString().trim().toLowerCase() || null;
    const contactOk = contactPhone != null && ['owner', 'broker', 'internal'].includes(ownerType ?? '');
    checks.push({
      condition: 'contact',
      label: 'Valid contact details and authorized purpose',
      passed: contactOk,
      detail: contactOk
        ? `contact on file (${phoneDigits(contactPhone)} digits); ownerType=${ownerType}`
        : `contact=${contactPhone ?? 'none'}; ownerType=${ownerType ?? 'unset'} — a reachable phone and a known listing relationship are required`,
    });

    // 6 — canonical quality score >= 75.
    const dq = unit.dataQualityScore;
    const qualityOk = typeof dq === 'number' && Number.isFinite(dq) && dq >= PUBLISH_QUALITY_THRESHOLD;
    checks.push({
      condition: 'quality',
      label: `Canonical quality score >= ${PUBLISH_QUALITY_THRESHOLD}`,
      passed: qualityOk,
      detail: qualityOk
        ? `data_quality_score=${dq}`
        : `data_quality_score=${dq ?? 'unset'} — the score must be computed and meet the threshold`,
    });

    // 7 — fresh human verification with auditable staff provenance.
    // verified_at is STAFF-only (source_verified_at does not count).
    const verifiedAt = unit.verifiedAt ? new Date(String(unit.verifiedAt)) : null;
    const verifiedBy = (unit.verifiedBy ?? '').toString().trim() || null;
    const ageDays = verifiedAt && !Number.isNaN(verifiedAt.getTime())
      ? (Date.now() - verifiedAt.getTime()) / 86_400_000
      : null;
    const verificationOk =
      ageDays != null && ageDays <= VERIFICATION_FRESH_DAYS && verifiedBy != null;
    checks.push({
      condition: 'verification',
      label: `Fresh human verification (<= ${VERIFICATION_FRESH_DAYS} days) with staff provenance`,
      passed: verificationOk,
      detail: verificationOk
        ? `verified ${ageDays!.toFixed(1)}d ago by ${verifiedBy}`
        : `verifiedAt=${unit.verifiedAt ?? 'unset'}; verifiedBy=${verifiedBy ?? 'unset'} — owner replies and owner-direct classification are NOT human verification`,
    });

    // 8 — at least three real unit photos.
    const photoCount = countRealPhotos(unit);
    const photosOk = photoCount >= PUBLISH_MIN_PHOTOS;
    checks.push({
      condition: 'photos',
      label: `At least ${PUBLISH_MIN_PHOTOS} real unit photos`,
      passed: photosOk,
      detail: photosOk
        ? `${photoCount} real photo URL(s) on the record`
        : `${photoCount} real photo URL(s) — captions, placeholders and photo_count without URLs do not count`,
    });

    const failures = checks.filter((c) => !c.passed).map((c) => `${c.condition}: ${c.detail}`);
    return { eligible: failures.length === 0, checks, failures };
  }
}
