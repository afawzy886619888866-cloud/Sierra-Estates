/**
 * Property Finder Egypt — Bidirectional Integration Helpers
 * Uses the Enterprise API client from lib/property-finder-client.ts
 * For Firebase-level operations (push, sync, webhook ingestion)
 */

export { pfClient } from '../property-finder-client';
export type { PFListing, PFLead, PFLocation, PFUser } from '../property-finder-client';
export { PFIntegrationService } from '../services/PFIntegrationService';

export const PF_EGYPT_PROPERTY_TYPES = {
  residential: [
    'apartment', 'villa', 'townhouse', 'penthouse', 'duplex',
    'chalet', 'twin-house', 'palace', 'roof', 'bungalow', 'cabin',
    'hotel-apartment', 'whole-building',
  ],
  commercial: [
    'office-space', 'retail', 'shop', 'warehouse', 'factory',
    'clinic', 'restaurant', 'cafeteria', 'show-room',
  ],
} as const;

export const PF_EGYPT_AMENITIES = {
  residential: [
    'central-ac', 'built-in-wardrobes', 'kitchen-appliances', 'security',
    'balcony', 'shared-gym', 'shared-spa', 'covered-parking', 'maids-room',
    'study', 'shared-pool', 'childrens-pool', 'private-garden', 'private-pool',
    'view-of-water', 'view-of-landmark', 'walk-in-closet', 'lobby-in-building',
  ],
  commercial: [
    'shared-gym', 'covered-parking', 'networked',
    'dining-in-building', 'conference-room', 'lobby-in-building',
  ],
} as const;
