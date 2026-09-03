/**
 * Concrete Repository Implementations
 * Each repository is a singleton instance for its table.
 */

import { SupabaseRepository } from './repository';

// Type definitions for domain models































// Singleton instances
export const LeadRepository = new SupabaseRepository('leads');
// 'properties' was a Firestore collection name; the table is public.listings.
export const PropertyRepository = new SupabaseRepository('listings');
export const DealRepository = new SupabaseRepository('deals');
