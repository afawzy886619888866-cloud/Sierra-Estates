import { getFirestore, doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export type OfferType = 'sale' | 'rent';
export type ListingType = 'primary' | 'resale' | 'landlord_direct' | 'developer_inventory';

export interface Property {
  id: string;
  title: string;
  propertyType: string;
  status: string;
  compound: string;
  location: string;
  city: string;
  area: number;
  bedrooms: number;
  price: number;
  pricePerSqm: number;
  coordinates?: { lat: number; lng: number };
  finishingType?: string;
  description?: string;
  offerType?: OfferType;
  listingType?: ListingType;
}

export const InventoryService = {
  async getProperty(id: string): Promise<Property | null> {
    const docRef = doc(db, 'listings', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Property;
    }
    return null;
  },

  async getFeaturedListings(count: number = 3): Promise<Property[]> {
    const q = query(collection(db, 'listings'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
  }
};
