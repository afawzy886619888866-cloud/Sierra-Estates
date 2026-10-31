/**
 * Property Finder Integration Service
 * Syncs leads and listings between Sierra Estates CRM and PF Enterprise API (OpenAPI 3.1.0)
 */

import { pfClient, PFListingRequest } from '../property-finder-client';
import { getRecord, insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { Unit, Lead, COLLECTIONS, PropertyType } from '../models/schema';
import { PFPropertyCategory, PFPropertyType } from '../property-finder/types';
import { resolveEgyptPfLocationId, SIERRA_PF_PROFILES } from '../property-finder/egypt-locations';
import { triggerNewListingNotification } from '../server/n8n';
import { toListingColumns } from '../server/listing-columns';
import {
  PublishGate,
  PublishGateError,
  PublishGateResult,
  PublishGateUnit,
} from './publish-gate';
import { canTransition, normalizeListingStatus } from './inventory/lifecycle';
import { EgyptListingValidator, sanitizePfText } from '../property-finder/validation';

export interface PFLeadSyncSummary {
  created: number;
  updated: number;
  skipped: number;
}

export interface PublishListingOptions {
  /** Validate the gate + provider field contract WITHOUT calling the remote
   * PF API. Used by the controlled live test (Phase 12: "run Property Finder
   * in dry-run mode first"). Can also be forced globally with PF_DRY_RUN=true. */
  dryRun?: boolean;
  /** Optional explicit Property Finder Public Profile ID (`assignedTo.id`). */
  publicProfileId?: number;
}

export interface PublishListingResult {
  id?: string | number;
  reference?: string;
  dryRun?: boolean;
  alreadyPublished?: boolean;
  gate: PublishGateResult;
}

type BilingualGateUnit = PublishGateUnit & {
  titleAr?: string | null;
  descriptionAr?: string | null;
  priceFrequency?: string | null;
};

const COMMERCIAL_PF_TYPES = new Set<PFPropertyType>([
  'office-space',
  'retail',
  'shop',
  'show-room',
  'clinic',
  'medical-facility',
  'warehouse',
  'co-working-space',
  'business-center',
  'restaurant',
  'cafeteria',
  'factory',
  'staff-accommodation',
  'farm',
]);

export class PFIntegrationService {

  static async syncIncomingLeads(): Promise<PFLeadSyncSummary> {
    const summary: PFLeadSyncSummary = { created: 0, updated: 0, skipped: 0 };
    const pfLeads = await pfClient.fetchLeads({ perPage: '50' });

    for (const lead of pfLeads.data) {
      const existing = await listRecords<{ id: string }>(COLLECTIONS.stakeholders, {
        where: [{ column: 'pfLeadId', value: lead.id }],
        select: 'id',
        limit: 1,
      });

      const phone =
        lead.sender?.contacts?.find(c => c.type === 'phone' || c.type === 'whatsappUsername')?.value || '';
      const email = lead.sender?.contacts?.find(c => c.type === 'email')?.value || '';

      if (!phone && existing.length === 0) {
        summary.skipped++;
        continue;
      }

      const payload: Partial<Lead> & Record<string, unknown> = {
        fullName: lead.sender?.name || 'Property Finder Lead',
        phone,
        email,
        source: 'property-finder',
        stage: 'inbound',
        originChannel: `Property Finder (${lead.channel})`,
        pfLeadId: lead.id,
        pfListingReferenceNumber: lead.listing?.reference || '',
      };

      if (existing.length === 0) {
        await insertRecord(COLLECTIONS.stakeholders, {
          ...payload,
          automation: { botInitiated: false, scoringCompleted: false, whatsappFollowupSent: false, viewingReminderSent: false },
        });
        summary.created++;
      } else {
        await updateRecord(COLLECTIONS.stakeholders, existing[0].id, payload);
        summary.updated++;
      }
    }

    return summary;
  }

  static async syncIncomingListings() {
    let imported = 0;
    let updated = 0;

    const pfResult = await pfClient.searchListings({ perPage: '100' });
    console.log('[PF API] Found listings count:', pfResult.data?.length || 0);

    const listings = pfResult.data || [];

    for (const listing of listings) {
      const ref = listing.reference || String(listing.id);
      const existing = await listRecords<{ id: string; status?: string }>(COLLECTIONS.units, {
        where: [{ column: 'pfReferenceNumber', value: ref }],
        select: 'id, status',
        limit: 1,
      });

      const priceVal =
        listing.price?.amounts?.sale ||
        listing.price?.amounts?.yearly ||
        listing.price?.amounts?.monthly ||
        0;

      let beds = 0;
      if (listing.bedrooms === 'studio') {
        beds = 0;
      } else if (listing.bedrooms) {
        beds = parseInt(String(listing.bedrooms), 10) || 0;
      }

      let baths = 0;
      if (listing.bathrooms && listing.bathrooms !== 'none') {
        baths = parseInt(String(listing.bathrooms), 10) || 0;
      }

      const locationName = listing.location?.name
        || (listing.location?.path ? listing.location.path.split('/').pop()?.trim() : '')
        || '';
      const compoundName = locationName
        || (listing.title?.en ? listing.title.en.split('-')[0]?.trim() : '')
        || 'General';

      const payload: Partial<Unit> = {
        title: listing.title?.en || listing.title?.ar || 'Property Finder Listing',
        description: listing.description?.en || listing.description?.ar || '',
        price: priceVal,
        propertyType: listing.type as PropertyType,
        status: 'available',
        dealType: listing.offeringType === 'rent' ? 'rent' : 'sale',
        category: listing.category || 'residential',
        bedrooms: beds,
        bathrooms: baths,
        area: listing.size || 0,
        compound: compoundName,
        location: locationName || undefined,
        pfReferenceNumber: ref,
        images: listing.media?.images?.map(i => i.original.url) || [],
      };

      const columnPayload = toListingColumns(payload as Record<string, unknown>);

      if (existing.length === 0) {
        const insertPayload = {
          ...columnPayload,
          compound: (columnPayload.compound as string) || compoundName,
          title: (columnPayload.title as string) || payload.title || 'Property Finder Listing',
          publishStatus: 'REVIEW_REQUIRED',
        };
        const newUnit = await insertRecord<{ id: string }>(COLLECTIONS.units, insertPayload);
        imported++;

        await triggerNewListingNotification({
          id: newUnit.id,
          title: payload.title || '',
          price: payload.price || 0,
          compound: payload.compound || payload.location || payload.city || ''
        });
      } else {
        const { publishStatus: _publishStatus, verifiedAt: _verifiedAt, verifiedBy: _verifiedBy, ...updatePayload } = columnPayload;
        const storedStatus = existing[0]?.status;
        if (storedStatus && updatePayload.status) {
          if (
            normalizeListingStatus(storedStatus) === normalizeListingStatus(updatePayload.status as string) ||
            !canTransition(storedStatus, updatePayload.status as string)
          ) {
            delete (updatePayload as Record<string, unknown>).status;
          }
        }
        await updateRecord(COLLECTIONS.units, existing[0].id, updatePayload);
        updated++;
      }
    }

    return { imported, updated };
  }

  /**
   * Evaluate the 8-condition C6 publish gate for a unit WITHOUT any remote
   * calls. Exposed so admin preview queues and tests can show exactly why a
   * record is or is not eligible.
   */
  static async evaluatePublishGate(unitId: string): Promise<PublishGateResult> {
    const unit = await getRecord<PublishGateUnit>(COLLECTIONS.units, unitId);
    if (!unit) throw new Error('Unit not found');
    return PublishGate.evaluate(unit);
  }

  static async publishListing(unitId: string, options: PublishListingOptions = {}): Promise<PublishListingResult> {
    const unit = await getRecord<BilingualGateUnit>(COLLECTIONS.units, unitId);
    if (!unit) throw new Error('Unit not found');

    // ── PUBLISH GATE (Phase 4) ──
    const gate = PublishGate.evaluate(unit);
    if (!gate.eligible) {
      throw new PublishGateError(gate);
    }

    // ── IDEMPOTENCY ──
    const automation: Record<string, unknown> =
      (unit.automation as Record<string, unknown> | undefined) ?? {};
    if (automation.isPublishedToPF === true && unit.pfReferenceNumber) {
      return {
        id: unit.pfReferenceNumber,
        reference: unit.pfReferenceNumber,
        alreadyPublished: true,
        gate,
      };
    }

    // §21: a PF listing carries only real unit data.
    const incomplete: string[] = [];
    if (!(Number(unit.price) > 0)) incomplete.push('price');
    if (!unit.propertyType) incomplete.push('propertyType');
    if (!(Number(unit.bedrooms) >= 0) || unit.bedrooms == null) incomplete.push('bedrooms');
    if (!(Number(unit.bathrooms) >= 0) || unit.bathrooms == null) incomplete.push('bathrooms');
    if (!(Number(unit.area) > 0)) incomplete.push('area');
    if (!unit.title) incomplete.push('title');
    if (incomplete.length > 0) {
      throw new Error(
        `Unit ${unitId} is not complete enough to publish to Property Finder — missing: ${incomplete.join(', ')}. Fill the record first; no default values are invented.`
      );
    }

    const locationId = await this.resolveLocationId(unit);
    if (locationId === null) {
      const lookup = unit.compound || unit.location || unit.city || '(no location on record)';
      throw new Error(
        `Could not resolve a Property Finder location for unit ${unitId} (searched: "${lookup}"). The old behavior silently published to location id 1 — add a compound→location mapping instead of guessing.`
      );
    }

    const isRent = unit.dealType === 'rent';
    const mappedType = this.mapPropertyType(unit.propertyType);
    const category: PFPropertyCategory = COMMERCIAL_PF_TYPES.has(mappedType)
      ? 'commercial'
      : 'residential';

    const rentPeriod: 'monthly' | 'yearly' =
      unit.priceFrequency === 'yearly' ? 'yearly' : 'monthly';
    const assignedProfileId =
      options.publicProfileId ||
      Number(process.env.PF_DEFAULT_PUBLIC_PROFILE_ID) ||
      SIERRA_PF_PROFILES.company;

    const cleanTitleEn = sanitizePfText(unit.title);
    const cleanTitleAr = unit.titleAr ? sanitizePfText(unit.titleAr) : undefined;
    const cleanDescEn = sanitizePfText(unit.description || unit.title);
    const cleanDescAr = unit.descriptionAr ? sanitizePfText(unit.descriptionAr) : undefined;

    const pfListing: PFListingRequest = {
      reference: unit.pfReferenceNumber || `SB-${unitId.slice(0, 8)}`,
      title: {
        en: cleanTitleEn,
        ...(cleanTitleAr ? { ar: cleanTitleAr } : {}),
      },
      description: {
        en: cleanDescEn,
        ...(cleanDescAr ? { ar: cleanDescAr } : {}),
      },
      price: isRent
        ? {
            type: rentPeriod,
            amounts: rentPeriod === 'yearly' ? { yearly: unit.price } : { monthly: unit.price },
          }
        : {
            type: 'sale',
            amounts: { sale: unit.price },
          },
      type: mappedType,
      category,
      offeringType: isRent ? 'rent' : 'sale',
      bedrooms: Number(unit.bedrooms) === 0 ? 'studio' : String(unit.bedrooms),
      bathrooms: Number(unit.bathrooms) === 0 ? 'none' : String(unit.bathrooms),
      size: Number(unit.area),
      location: { id: locationId },
      assignedTo: { id: assignedProfileId },
      media: {
        images: (unit.images || []).map(url => ({ original: { url } })),
      },
    };

    const validation = EgyptListingValidator.validate(pfListing);
    if (!validation.isValid) {
      throw new Error(
        `PF listing request failed provider validation: ${validation.errors.join('; ')}`
      );
    }

    const dryRun = options.dryRun === true || process.env.PF_DRY_RUN === 'true';
    if (dryRun) {
      return {
        dryRun: true,
        gate,
        reference: pfListing.reference,
      };
    }

    const result = await pfClient.createListing(pfListing);

    if (result.id) {
      try {
        await pfClient.publishListing(result.id);
      } catch (publishErr: unknown) {
        const errMsg = publishErr instanceof Error ? publishErr.message : String(publishErr);
        await updateRecord(COLLECTIONS.units, unitId, {
          automation: { ...automation, isPublishedToPF: false, pfPendingPublish: true },
          pfReferenceNumber: result.reference || String(result.id),
          pfStatus: 'pending_publish',
          lastSyncAt: new Date().toISOString(),
          syncSource: 'property-finder',
        });
        throw new Error(
          `PF listing created (id ${result.id}) but remote publish failed: ${errMsg}. Record marked pending_publish — retry is safe.`
        );
      }
    }

    await updateRecord(COLLECTIONS.units, unitId, {
      automation: { ...automation, isPublishedToPF: true, pfPendingPublish: false },
      pfReferenceNumber: result.reference || String(result.id),
      pfStatus: 'published',
      lastSyncAt: new Date().toISOString(),
      syncSource: 'property-finder',
    });

    return { ...result, gate };
  }

  private static async resolveLocationId(unit: Unit): Promise<number | null> {
    // §21: no 'New Cairo' fallback lookup and no fabricated location id 1.
    const candidates = [unit.compound, unit.location, unit.city].filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
    if (candidates.length === 0) return null;

    // 1. Try live Atlas /v1/locations endpoint first when available
    try {
      const result = await pfClient.searchLocations(candidates[0]);
      if (result.data?.[0]?.id) {
        return Number(result.data[0].id);
      }
    } catch {
      // Atlas /v1/locations returns 404 on accounts without location-tree browse;
      // fall through to verified Egypt static catalog.
    }

    // 2. Verified Egypt Property Finder integer location catalog (never guesses)
    for (const candidate of candidates) {
      const resolved = resolveEgyptPfLocationId(candidate);
      if (resolved !== null) {
        return resolved;
      }
    }
    return null;
  }

  private static mapPropertyType(type: string): PFPropertyType {
    const mapping: Record<string, PFPropertyType> = {
      apartment: 'apartment',
      studio: 'apartment',
      villa: 'villa',
      'standalone villa': 'villa',
      'standalone-villa': 'villa',
      townhouse: 'townhouse',
      'town house': 'townhouse',
      'town-house': 'townhouse',
      penthouse: 'penthouse',
      duplex: 'duplex',
      chalet: 'chalet',
      'twin-house': 'twin-house',
      'twin house': 'twin-house',
      twinhouse: 'twin-house',
      palace: 'palace',
      roof: 'roof',
      'hotel-apartment': 'hotel-apartment',
      land: 'land',
      office: 'office-space',
      'office-space': 'office-space',
      clinic: 'clinic',
      retail: 'retail',
      shop: 'shop',
      'whole-building': 'whole-building',
      'full-floor': 'full-floor',
      'half-floor': 'half-floor',
    };
    const mapped = mapping[type?.trim().toLowerCase()];
    if (!mapped) {
      throw new Error(
        `Unknown property type "${type}" has no Property Finder mapping — refusing to default to 'apartment'.`
      );
    }
    return mapped;
  }
}
