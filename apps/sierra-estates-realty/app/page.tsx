import { readListings } from '@/lib/services/listings-query';
import type { Listing } from '@/lib/types';
import ClientHome from './ClientHome';

export default async function HomePage() {
  let initialListings: Listing[] = [];
  try {
    const items = await readListings();
    initialListings = items.filter(l => l.status !== 'archived').slice(0, 6);
  } catch (err) {
    console.warn('[HomePage] Failed to load initial listings:', err);
  }

  return <ClientHome initialApiListings={initialListings} />;
}
