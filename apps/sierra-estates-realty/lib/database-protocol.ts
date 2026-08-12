import { db } from './firebase';
import { logger } from '@/lib/logger';
import {
  collection,
  getDocs,
  query,
  where,
  QueryConstraint,
} from 'firebase/firestore';

/**
 * sierra estates — DATA INTERFACE MODEL
 * Strict TypeScript schema for all property documents
 */
export interface SierraProperty {
  id: string;
  sbrCode: string; // e.g., "MVD-3F-85K"
  compound: string; // e.g., "Mountain View Desert"
  name: string; // Property display name
  specs: {
    bedrooms: number;
    bathrooms: number;
    squareMeters: number;
    furnished: 'furnished' | 'unfurnished' | 'semi-furnished';
  };
  price: number; // In EGP
  pricePerSqm?: number;
  imageUrl?: string;
  imageUrls?: string[];
  type: 'Rent' | 'Resale' | 'Lease';
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  tags: string[]; // e.g., ["luxury", "offmarket", "investment"]
  status: 'Available' | 'Sold' | 'Rented' | 'Hidden';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Async Query: Fetch properties by type
 */
export async function fetchPropertiesFromDB(
  type: 'Rent' | 'Resale' | 'Lease'
): Promise<SierraProperty[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('type', '==', type),
      where('status', '==', 'Available'),
    ];

    const q = query(collection(db, 'properties'), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    } as SierraProperty));
  } catch (error) {
    logger.error(`[DB] Error fetching ${type} properties:`, error);
    return [];
  }
}

/**
 * Async Query: Fetch all map-ready properties (spatial viewport)
 * Returns properties with complete geolocation data
 */
export async function fetchAllMapProperties(): Promise<SierraProperty[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'Available'),
      where('location.lat', '!=', null),
      where('location.lng', '!=', null),
    ];

    const q = query(collection(db, 'properties'), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      } as SierraProperty))
      .filter((prop) => prop.location.lat && prop.location.lng);
  } catch (error) {
    logger.error('[DB] Error fetching map properties:', error);
    return [];
  }
}

/**
 * Batch fetch with compound filtering
 */
export async function fetchPropertiesByCompound(
  compound: string
): Promise<SierraProperty[]> {
  try {
    const q = query(
      collection(db, 'properties'),
      where('compound', '==', compound),
      where('status', '==', 'Available')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    } as SierraProperty));
  } catch (error) {
    logger.error(`[DB] Error fetching ${compound} properties:`, error);
    return [];
  }
}
