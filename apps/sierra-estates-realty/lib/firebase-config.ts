import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export { db };

interface InvestmentStakeholderRecord {
  propertyCode: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  message: string;
  source: string;
  status: string;
}

interface ViewingRequestRecord {
  propertyCode: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  preferredDate: string;
  preferredTime: string;
  numberOfPeople: number;
  message: string;
  status: string;
}

export async function addLead(payload: InvestmentStakeholderRecord): Promise<string> {
  const docRef = await addDoc(collection(db, 'leads'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function addViewingRequest(payload: ViewingRequestRecord): Promise<string> {
  const docRef = await addDoc(collection(db, 'viewing_requests'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}
