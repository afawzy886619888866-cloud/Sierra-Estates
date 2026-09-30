import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import AddListingForm from '@/components/client/AddListingForm';

export const metadata: Metadata = {
  title: 'Add a Listing',
  description:
    'List your unit with Sierra Estates — verified in 24 hours, priced against live New Cairo comparables, and put in front of matched buyers and tenants.',
  icons: { icon: '/assets/logo-mark-96.png' },
};

export default function AddListingPage() {
  return (
    <SiteShell active={null}>
      <div style={{ paddingTop: 88, paddingBottom: 64 }}>
        <AddListingForm />
      </div>
    </SiteShell>
  );
}
