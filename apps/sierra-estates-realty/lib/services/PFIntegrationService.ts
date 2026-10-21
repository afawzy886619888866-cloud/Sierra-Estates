/**
 * Property Finder Integration Service
 * Syncs leads and listings between Sierra Estates CRM and PF Enterprise API (atlas.propertyfinder.com/v1)
 */

import { pfClient, PFListingRequest } from '../property-finder-client';
import { getRecord, insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { Unit, Lead, COLLECTIONS } from '../models/schema';
import { PFPropertyType } from '../property-finder/types';
import { triggerNewListingNotification } from '../server/n8n';
import { toListingColumns } from '../server/listing-columns';
import {
  PublishGate,
  PublishGateError,
  PublishGateResult,
  PublishGateUnit,
} from './publish-gate';
import { canTransition, normalizeListingStatus } from './inventory/lifecycle';
import { EgyptListingValidator } from '../property-finder/validation';

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
}

export interface PublishListingResult {
  id?: string | number;
  reference?: string;
  dryRun?: boolean;
  alreadyPublished?: boolean;
  gate: PublishGateResult;
}

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

      const phone = lead.sender?.contacts?.find(c => c.type === 'phone')?.value || '';
      const email = lead.sender?.contacts?.find(c => c.type === 'email')?.value || '';

      if (!phone && existing.length === 0) {
        summary.skipped++;
        continue;
      }

      const payload: Partial<Lead> & Record<string, unknown> = {
        // `full_name` is the column; `name` is what the admin API maps it to.
        fullName: lead.sender?.name || 'Property Finder Lead',
        phone,
        email,
        source: 'property-finder',
        stage: 'inbound',
        // NOTE: no `phase` here — the leads table has no phase column, and
        // writing it made every daily sync fail with a schema-cache error.
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

      const priceVal = listing.price?.amounts?.sale || listing.price?.amounts?.yearly || listing.price?.amounts?.monthly || 0;

      let beds = 0;
      if (listing.bedrooms === 'studio') {
        beds = 0;
      } else if (listing.bedrooms) {
        beds = parseInt(listing.bedrooms as string) || 0;
      }

      let baths = 0;
      if (listing.bathrooms && listing.bathrooms !== 'none') {
        baths = parseInt(listing.bathrooms as string) || 0;
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
        propertyType: listing.type as any,
        // FIX (Inventory OS v2): a rent OFFER is not a rented unit. The old
        // mapping ('rent' → status 'rented') made every imported rental
        // listing appear unavailable on the portal. Offer type now goes to
        // dealType; availability stays 'available'.
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

        // Trigger n8n webhook for new listing matching
        await triggerNewListingNotification({
          id: newUnit.id,
          title: payload.title || '',
          price: payload.price || 0,
          compound: payload.compound || payload.location || payload.city || ''
        });
      } else {
        // ANTI-OVERWRITE: Do not touch human verification fields on automated update
        const { publishStatus: _publishStatus, verifiedAt: _verifiedAt, verifiedBy: _verifiedBy, ...updatePayload } = columnPayload;
        // LIFECYCLE GUARD: If transitioning from stored status to incoming status is illegal
        // (e.g. unit was archived or sold), or if both normalize to the same state (e.g. active vs available),
        // retain stored status so the database trigger is not violated.
        const storedStatus = existing[0]?.status;
        if (storedStatus && updatePayload.status) {
          if (
            normalizeListingStatus(storedStatus) === normalizeListingStatus(updatePayload.status as string) ||
            !canTransition(storedStatus, updatePayload.status as string)
          ) {
            delete (updatePayload as any).status;
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
    const unit = await getRecord<PublishGateUnit>(COLLECTIONS.units, unitId);
    if (!unit) throw new Error('Unit not found');

    // ── PUBLISH GATE (Phase 4) ──
    // The complete C6 gate is enforced HERE, inside the service, so no caller
    // (August agent, chat scan, Easy Listing, Telegram, Sheet sync, admin bulk
    // action, AI parser, manual dispatcher) can bypass it. REVIEW_REQUIRED
    // means private staging, never external publication.
    const gate = PublishGate.evaluate(unit);
    if (!gate.eligible) {
      throw new PublishGateError(gate);
    }

    // ── IDEMPOTENCY ──
    // Re-invoking publishListing on a unit that already carries a genuine
    // remote acceptance must not create a duplicate remote listing.
    const automation = (unit as any).automation ?? {};
    if (automation.isPublishedToPF === true && unit.pfReferenceNumber) {
      return {
        id: unit.pfReferenceNumber,
        reference: unit.pfReferenceNumber,
        alreadyPublished: true,
        gate,
      };
    }

    // §21: a PF listing carries only real unit data. Missing price, type,
    // bedroom/bathroom counts or area fail loudly instead of being defaulted
    // (the old path invented 0 bedrooms / 1 bathroom / 1 sqm / a wrong
    // location id 1 for incomplete units).
    const incomplete: string[] = [];
    if (!(Number(unit.price) > 0)) incomplete.push('price');
    if (!unit.propertyType) incomplete.push('propertyType');
    // Studios legitimately have 0 bedrooms — treat 0+ as present, only an
    // absent/negative value is incomplete.
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

    // FIX (Inventory OS v2): rent-vs-sale is an OFFER attribute (dealType),
    // not an availability attribute. Units that are genuinely rented
    // (status='rented') must not be re-published to PF at all.
    const isRent = unit.dealType === 'rent';

    const pfListing: PFListingRequest = {
      reference: unit.pfReferenceNumber || `SB-${unitId.slice(0, 8)}`,
      title: { en: unit.title },
      description: { en: unit.description || unit.title },
      price: { 
        type: isRent ? 'yearly' : 'sale',
        amounts: isRent ? { yearly: unit.price } : { sale: unit.price }
      },
      type: this.mapPropertyType(unit.propertyType),
      category: 'residential',
      offeringType: isRent ? 'rent' : 'sale',
      bedrooms: String(unit.bedrooms),
      bathrooms: String(unit.bathrooms),
      size: Number(unit.area),
      location: { id: locationId },
      media: {
        images: (unit.images || []).map(url => ({ original: { url } })),
      },
    };

    // Provider-side contract validation runs for BOTH dry-run and live, so a
    // dry run reports the same field-level problems a live call would hit.
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
      // ── ORDERING FIX ──
      // The remote /publish call happens BEFORE the local row is marked
      // published. If the publish step fails, the DB no longer claims
      // success it did not earn (old bug: isPublishedToPF:true was written
      // before pfClient.publishListing, so a failed publish still reported
      // as live).
      try {
        await pfClient.publishListing(result.id);
      } catch (publishErr: any) {
        // The remote draft EXISTS but is not live. Record the honest state:
        // created (with reference) but pending publication, retryable.
        await updateRecord(COLLECTIONS.units, unitId, {
          automation: { ...automation, isPublishedToPF: false, pfPendingPublish: true },
          pfReferenceNumber: result.reference || String(result.id),
          pfStatus: 'pending_publish',
          lastSyncAt: new Date().toISOString(),
          syncSource: 'property-finder',
        });
        throw new Error(
          `PF listing created (id ${result.id}) but remote publish failed: ${publishErr?.message ?? publishErr}. Record marked pending_publish — retry is safe.`
        );
      }
    }

    // `automation` is one JSONB column, so the dotted-path update becomes a
    // merge onto the object already on the unit.
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
    // §21: no 'New Cairo' fallback lookup and no fabricated location id 1 —
    // an unresolved location is an error the caller must handle.
    const lookup = unit.compound || unit.location || unit.city;
    if (!lookup) return null;
    try {
      const result = await pfClient.searchLocations(lookup);
      return result.data[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  private static mapPropertyType(type: string): PFPropertyType {
    const mapping: Record<string, PFPropertyType> = {
      apartment: 'apartment', villa: 'villa', townhouse: 'townhouse',
      penthouse: 'penthouse', duplex: 'duplex', chalet: 'chalet',
      'twin-house': 'twin-house', palace: 'palace', land: 'land',
    };
    const mapped = mapping[type?.toLowerCase()];
    if (!mapped) {
      // Phase 4: the old code silently defaulted unknown types to
      // 'apartment' — a fabrication inside the publish path. Unknown types
      // now fail loudly (the C6 gate rejects them first; this guard covers
      // direct mapPropertyType callers).
      throw new Error(
        `Unknown property type "${type}" has no Property Finder mapping — refusing to default to 'apartment'.`
      );
    }
    return mapped;
  }
}

