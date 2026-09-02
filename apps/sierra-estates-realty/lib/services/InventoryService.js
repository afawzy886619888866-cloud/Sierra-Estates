import 'server-only';
import { adminDb } from '@/lib/server/firebase-admin';

/**
 * Server-only inventory reads via the Firebase Admin SDK. Previously this
 * read through the client `firebase/firestore` SDK with NEXT_PUBLIC_* keys —
 * meaning a server route (WealthService -> /api/wealth/portfolio) was
 * silently depending on Firestore security rules instead of the admin-trust
 * model every other app/api/ route uses. Client-side code should call
 * /api/listings instead of importing this file.
 */

 





















export const InventoryService = {
  async getProperty(id) {
    const docSnap = await adminDb.collection('listings').doc(id).get();
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() } ;
    }
    return null;
  },

  async getFeaturedListings(count = 3) {
    const snap = await adminDb.collection('listings').limit(count).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } ));
  },
};
