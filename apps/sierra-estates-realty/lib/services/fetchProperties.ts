import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase securely (Prevent multi-app compilation errors)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface Property {
  id: string;
  sbrCode: string;
  compound: string;
  name: string;
  specs: string;
  price: string;
  imageUrl: string;
  type: 'Rent' | 'Resale';
  tags: string[];
}

/**
 * Fetches properties from Firestore filtered by type (Rent or Resale)
 */
export async function fetchPropertiesFromDB(typeFilter: 'Rent' | 'Resale'): Promise<Property[]> {
  try {
    const propertiesRef = collection(db, 'Properties');
    const q = query(propertiesRef, where('type', '==', typeFilter));
    const querySnapshot = await getDocs(q);
    
    const properties: Property[] = [];
    querySnapshot.forEach((doc) => {
      properties.push({ id: doc.id, ...doc.data() } as Property);
    });
    
    return properties;
  } catch (error) {
    console.error("Firestore database fetching failed: ", error);
    // Fallback Mock data matching New Cairo Context if database is empty during init
    return ([
      {
        id: "MVD-V1",
        sbrCode: "MVD-3F-75K",
        name: "Azure Heights Estate",
        compound: "Mivida",
        specs: "BUA: 350m² | Land: 650m²",
        price: "75,000 EGP",
        type: "Rent" as const,
        imageUrl: "https://images.unsplash.com/photo-1613490908578-812e52bb1667?q=80&w=1200&auto=format&fit=crop",
        tags: ["Standalone", "Fully Finished"]
      },
      {
        id: "UPT-S2",
        sbrCode: "UPT-4S-120M",
        name: "Celesta Golf Mansion",
        compound: "Uptown Cairo",
        specs: "BUA: 472m² | Land: 800m²",
        price: "35,000,000 EGP",
        type: "Resale" as const,
        imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop",
        tags: ["Golf View", "Ready to Move"]
      }
    ] satisfies Property[]).filter(item => item.type === typeFilter);
  }
}
