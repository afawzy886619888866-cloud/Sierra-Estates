/**
 * Property Finder Integration Service
 * Syncs leads and listings between Sierra Estates CRM and PF Enterprise API (atlas.propertyfinder.com/v1)
 */

import { pfClient, PFListingRequest } from '../property-finder-client';
import { adminDb } from '../server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
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
      const existing = await adminDb.collection(COLLECTIONS.stakeholders)
        .where('pfLeadId', '==', lead.id)
        .get();

      const phone = lead.sender?.contacts?.find(c => c.type === 'phone')?.value || '';
      const email = lead.sender?.contacts?.find(c => c.type === 'email')?.value || '';

      if (!phone && existing.empty) {
        summary.skipped++;
        continue;
      }

      const payload: Partial<Lead> & Record<string, unknown> = {
        name: lead.sender?.name || 'Property Finder Lead',
        phone,
        email,
        source: 'property-finder',
        stage: 'inbound',
        phase: lead.status === 'replied' ? 'consultation' : 'acquisition',
        originChannel: `Property Finder (${lead.channel})`,
        pfLeadId: lead.id,
        pfListingReferenceNumber: lead.listing?.reference || '',
        updatedAt: Timestamp.now(),
      };

      if (existing.empty) {
        await adminDb.collection(COLLECTIONS.stakeholders).add({
          ...payload,
          automation: { botInitiated: false, scoringCompleted: false, whatsappFollowupSent: false, viewingReminderSent: false },
          createdAt: Timestamp.now(),
        });
        summary.created++;
      } else {
        await existing.docs[0].ref.update(payload);
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
      const existing = await adminDb.collection(COLLECTIONS.units)
        .where('pfReferenceNumber', '==', ref)
        .get();

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
        status: listing.offeringType === 'rent' ? 'rented' : 'available',
        category: listing.category || 'residential',
        bedrooms: beds,
        bathrooms: baths,
        area: listing.size || 0,
        pfReferenceNumber: ref,
        updatedAt: Timestamp.now(),
        images: listing.media?.images?.map(i => i.original.url) || [],
      };

      if (existing.empty) {
        const newDocRef = await adminDb.collection(COLLECTIONS.units).add({ ...payload, createdAt: Timestamp.now() });
        imported++;

        // Trigger n8n webhook for new listing matching
        await triggerNewListingNotification({
          id: newDocRef.id,
          title: payload.title || '',
          price: payload.price || 0,
          compound: payload.compound || payload.location || payload.city || ''
        });
      } else {
        await existing.docs[0].ref.update(payload);
        updated++;
      }
    }

    return { imported, updated };
  }

  static async publishListing(unitId: string) {
    const unitSnap = await adminDb.collection(COLLECTIONS.units).doc(unitId).get();
    if (!unitSnap.exists) throw new Error('Unit not found');

    const unit = { id: unitSnap.id, ...unitSnap.data() } as Unit;
    const locationId = await this.resolveLocationId(unit);
    const _publicProfileId = await this.resolvePublicProfileId();

    const isRent = unit.status === 'rented';

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
      bedrooms: String(unit.bedrooms || 0),
      bathrooms: String(unit.bathrooms || 1),
      size: Math.max(unit.area || 0, 1),
      location: { id: locationId },
      media: {
        images: (unit.images || []).map(url => ({ original: { url } })),
      },
    };

    const result = await pfClient.createListing(pfListing);

    await adminDb.collection(COLLECTIONS.units).doc(unitId).update({
      'automation.isPublishedToPF': true,
      pfReferenceNumber: result.reference || String(result.id),
      lastSyncAt: Timestamp.now(),
      syncSource: 'property-finder',
    });

    if (result.id) {
      await pfClient.publishListing(result.id);
    }

    return result;
  }

  private static async resolveLocationId(unit: Unit): Promise<number> {
    const lookup = unit.compound || unit.location || unit.city || 'New Cairo';
    try {
      const result = await pfClient.searchLocations(lookup);
      return result.data[0]?.id || 1;
    } catch {
      return 1;
    }
  }

  private static async resolvePublicProfileId(): Promise<number> {
    try {
      const users = await pfClient.getUsers({ perPage: '1' });
      return users.data[0]?.publicProfile?.id || 1;
    } catch {
      return 1;
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

