/**
 * Concrete Repository Implementations
 * Each repository is a singleton instance for its collection
 */

import { FirestoreRepository } from './repository';

// Type definitions for domain models































// Singleton instances
export const LeadRepository = new FirestoreRepository('leads');
export const PropertyRepository = new FirestoreRepository('properties');
export const DealRepository = new FirestoreRepository('deals');
