import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import AddListingForm from '@/components/client/AddListingForm';

export const metadata: Metadata = {
  title: 'List Your Property | Sierra Estates New Cairo',
  description:
    'List your property with Sierra Estates — fast 24h verification, 4K GIS mapping, automated Google Sheets & Supabase sync, and direct access to qualified buyers and tenants.',
  icons: { icon: '/assets/logo-mark-96.png' },
};

export default function ListPropertyPage() {
  return (
    <SiteShell active={null}>
      <div style={{ paddingTop: 88, paddingBottom: 64 }}>
        <AddListingForm />
      </div>
    </SiteShell>
  );
}
