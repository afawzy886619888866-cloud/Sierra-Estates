/**
 * Concrete Repository Implementations
 * Each repository is a singleton instance for its table.
 */

import { SupabaseRepository } from './repository';

// Type definitions for domain models
export interface Lead extends Record<string, unknown> {
  id: string;
  email: string;
  name: string;
  phone?: string;
  investmentIntent?: string;
  budget?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property extends Record<string, unknown> {
  id: string;
  sbrCode: string;
  name: string;
  compound: string;
  type: 'Rent' | 'Resale' | 'Lease';
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal extends Record<string, unknown> {
  id: string;
  leadId: string;
  propertyId: string;
  status: 'draft' | 'offered' | 'signing' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

// Singleton instances
export const LeadRepository = new SupabaseRepository<Lead>('leads');
// 'properties' was a Firestore collection name; the table is public.listings.
export const PropertyRepository = new SupabaseRepository<Property>('listings');
export const DealRepository = new SupabaseRepository<Deal>('deals');
