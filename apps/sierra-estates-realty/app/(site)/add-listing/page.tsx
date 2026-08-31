import type { Metadata } from 'next';
import AddListingForm from '@/components/client/AddListingForm';

export const metadata: Metadata = {
  title: 'Add a Listing',
  description:
    'List your unit with Sierra Estates — verified in 24 hours, priced against live New Cairo comparables, and put in front of matched buyers and tenants.',
  icons: { icon: '/assets/logo-mark-96.png' },
};

export default function AddListingPage() {
  return <AddListingForm />;
}
