 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Property Finder Integration Service
 * Syncs leads and listings between Sierra Estates CRM and PF Enterprise API (atlas.propertyfinder.com/v1)
 */

import { pfClient, } from '../property-finder-client';
import { adminDb } from '../server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../models/schema';

import { triggerNewListingNotification } from '../server/n8n';







export class PFIntegrationService {

  static async syncIncomingLeads() {
    const summary = { created: 0, updated: 0, skipped: 0 };
    const pfLeads = await pfClient.fetchLeads({ perPage: '50' });

    for (const lead of pfLeads.data) {
      const existing = await adminDb.collection(COLLECTIONS.stakeholders)
        .where('pfLeadId', '==', lead.id)
        .get();

      const phone = _optionalChain([lead, 'access', _ => _.sender, 'optionalAccess', _2 => _2.contacts, 'optionalAccess', _3 => _3.find, 'call', _4 => _4(c => c.type === 'phone'), 'optionalAccess', _5 => _5.value]) || '';
      const email = _optionalChain([lead, 'access', _6 => _6.sender, 'optionalAccess', _7 => _7.contacts, 'optionalAccess', _8 => _8.find, 'call', _9 => _9(c => c.type === 'email'), 'optionalAccess', _10 => _10.value]) || '';

      if (!phone && existing.empty) {
        summary.skipped++;
        continue;
      }

      const payload = {
        name: _optionalChain([lead, 'access', _11 => _11.sender, 'optionalAccess', _12 => _12.name]) || 'Property Finder Lead',
        phone,
        email,
        source: 'property-finder',
        stage: 'inbound',
        phase: lead.status === 'replied' ? 'consultation' : 'acquisition',
        originChannel: `Property Finder (${lead.channel})`,
        pfLeadId: lead.id,
        pfListingReferenceNumber: _optionalChain([lead, 'access', _13 => _13.listing, 'optionalAccess', _14 => _14.reference]) || '',
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
    console.log('[PF API] Found listings count:', _optionalChain([pfResult, 'access', _15 => _15.data, 'optionalAccess', _16 => _16.length]) || 0);

    const listings = pfResult.data || [];

    for (const listing of listings) {
      const ref = listing.reference || String(listing.id);
      const existing = await adminDb.collection(COLLECTIONS.units)
        .where('pfReferenceNumber', '==', ref)
        .get();

      const priceVal = _optionalChain([listing, 'access', _17 => _17.price, 'optionalAccess', _18 => _18.amounts, 'optionalAccess', _19 => _19.sale]) || _optionalChain([listing, 'access', _20 => _20.price, 'optionalAccess', _21 => _21.amounts, 'optionalAccess', _22 => _22.yearly]) || _optionalChain([listing, 'access', _23 => _23.price, 'optionalAccess', _24 => _24.amounts, 'optionalAccess', _25 => _25.monthly]) || 0;

      let beds = 0;
      if (listing.bedrooms === 'studio') {
        beds = 0;
      } else if (listing.bedrooms) {
        beds = parseInt(listing.bedrooms ) || 0;
      }

      let baths = 0;
      if (listing.bathrooms && listing.bathrooms !== 'none') {
        baths = parseInt(listing.bathrooms ) || 0;
      }

      const payload = {
        title: _optionalChain([listing, 'access', _26 => _26.title, 'optionalAccess', _27 => _27.en]) || '',
        description: _optionalChain([listing, 'access', _28 => _28.description, 'optionalAccess', _29 => _29.en]) || '',
        price: priceVal,
        propertyType: listing.type ,
        status: listing.offeringType === 'rent' ? 'rented' : 'available',
        category: listing.category || 'residential',
        bedrooms: beds,
        bathrooms: baths,
        area: listing.size || 0,
        pfReferenceNumber: ref,
        updatedAt: Timestamp.now(),
        images: _optionalChain([listing, 'access', _30 => _30.media, 'optionalAccess', _31 => _31.images, 'optionalAccess', _32 => _32.map, 'call', _33 => _33(i => i.original.url)]) || [],
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

  static async publishListing(unitId) {
    const unitSnap = await adminDb.collection(COLLECTIONS.units).doc(unitId).get();
    if (!unitSnap.exists) throw new Error('Unit not found');

    const unit = { id: unitSnap.id, ...unitSnap.data() } ;
    const locationId = await this.resolveLocationId(unit);
    const _publicProfileId = await this.resolvePublicProfileId();

    const isRent = unit.status === 'rented';

    const pfListing = {
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

   static async resolveLocationId(unit) {
    const lookup = unit.compound || unit.location || unit.city || 'New Cairo';
    try {
      const result = await pfClient.searchLocations(lookup);
      return _optionalChain([result, 'access', _34 => _34.data, 'access', _35 => _35[0], 'optionalAccess', _36 => _36.id]) || 1;
    } catch (e) {
      return 1;
    }
  }

   static async resolvePublicProfileId() {
    try {
      const users = await pfClient.getUsers({ perPage: '1' });
      return _optionalChain([users, 'access', _37 => _37.data, 'access', _38 => _38[0], 'optionalAccess', _39 => _39.publicProfile, 'optionalAccess', _40 => _40.id]) || 1;
    } catch (e2) {
      return 1;
    }
  }

   static mapPropertyType(type) {
    const mapping = {
      apartment: 'apartment', villa: 'villa', townhouse: 'townhouse',
      penthouse: 'penthouse', duplex: 'duplex', chalet: 'chalet',
      'twin-house': 'twin-house', palace: 'palace', land: 'land',
    };
    return mapping[_optionalChain([type, 'optionalAccess', _41 => _41.toLowerCase, 'call', _42 => _42()])] || 'apartment';
  }
}

