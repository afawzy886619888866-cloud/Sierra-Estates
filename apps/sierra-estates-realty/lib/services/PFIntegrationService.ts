/**
 * Property Finder Integration Service
 * Syncs leads and listings between Sierra Estates CRM and PF Enterprise API (atlas.propertyfinder.com/v1)
 */

import { pfClient, PFListingRequest } from '../property-finder-client';
import { getRecord, insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { Unit, Lead, COLLECTIONS } from '../models/schema';
import { PFPropertyType } from '../property-finder/types';
import { triggerNewListingNotification } from '../server/n8n';

export interface PFLeadSyncSummary {
  created: number;
  updated: number;
  skipped: number;
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
      const existing = await listRecords<{ id: string }>(COLLECTIONS.units, {
        where: [{ column: 'pfReferenceNumber', value: ref }],
        select: 'id',
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

      const payload: Partial<Unit> = {
        title: listing.title?.en || '',
        description: listing.description?.en || '',
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
        pfReferenceNumber: ref,
        images: listing.media?.images?.map(i => i.original.url) || [],
      };

      if (existing.length === 0) {
        const newUnit = await insertRecord<{ id: string }>(COLLECTIONS.units, payload);
        imported++;

        // Trigger n8n webhook for new listing matching
        await triggerNewListingNotification({
          id: newUnit.id,
          title: payload.title || '',
          price: payload.price || 0,
          compound: payload.compound || payload.location || payload.city || ''
        });
      } else {
        await updateRecord(COLLECTIONS.units, existing[0].id, payload);
        updated++;
      }
    }

    return { imported, updated };
  }

  static async publishListing(unitId: string) {
    const unit = await getRecord<Unit>(COLLECTIONS.units, unitId);
    if (!unit) throw new Error('Unit not found');
<<<<<<< HEAD
=======

    // §21: a PF listing carries only real unit data. Missing price, type,
    // bedroom/bathroom counts or area fail loudly instead of being defaulted
    // (the old path invented 0 bedrooms / 1 bathroom / 1 sqm / a wrong
    // location id 1 for incomplete units).
    const incomplete: string[] = [];
    if (!(Number(unit.price) > 0)) incomplete.push('price');
    if (!unit.propertyType) incomplete.push('propertyType');
    if (!(Number(unit.bedrooms) > 0)) incomplete.push('bedrooms');
    if (!(Number(unit.bathrooms) > 0)) incomplete.push('bathrooms');
    if (!(Number(unit.area) > 0)) incomplete.push('area');
    if (!unit.title) incomplete.push('title');
    if (incomplete.length > 0) {
      throw new Error(
        `Unit ${unitId} is not complete enough to publish to Property Finder — missing: ${incomplete.join(', ')}. Fill the record first; no default values are invented.`
      );
    }

>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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

    const result = await pfClient.createListing(pfListing);

    // `automation` is one JSONB column, so the dotted-path update becomes a
    // merge onto the object already on the unit.
    await updateRecord(COLLECTIONS.units, unitId, {
      automation: { ...((unit as any).automation ?? {}), isPublishedToPF: true },
      pfReferenceNumber: result.reference || String(result.id),
      lastSyncAt: new Date().toISOString(),
      syncSource: 'property-finder',
    });

    if (result.id) {
      await pfClient.publishListing(result.id);
    }

    return result;
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
    return mapping[type?.toLowerCase()] || 'apartment';
  }
}

