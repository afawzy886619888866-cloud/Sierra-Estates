import { db } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export { db };























export async function addLead(payload) {
  const docRef = await addDoc(collection(db, 'leads'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function addViewingRequest(payload) {
  const docRef = await addDoc(collection(db, 'viewing_requests'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}
