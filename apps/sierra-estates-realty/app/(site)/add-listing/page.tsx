import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import PublicAddListingForm from '@/components/client/PublicAddListingForm';

export const metadata: Metadata = {
  title: 'Add a Listing',
  description:
    'List your unit with Sierra Estates — deduplicated, coded with the official Sierra unit code, synced to our live inventory, and put in front of matched buyers and tenants within 24 hours.',
  icons: { icon: '/assets/logo-mark-96.png' },
};

export default function AddListingPage() {
  return (
    <SiteShell active={null}>
      <div style={{ paddingTop: 88, paddingBottom: 64 }}>
        <PublicAddListingForm />
      </div>
    </SiteShell>
  );
}
