import '../../site-styles/index.css';
import '../../site-styles/site-refinements.css';
import SiteShell from '@/components/site/SiteShell';
import AddListingForm from '@/components/client/AddListingForm';

export const metadata = {
  title: 'Add Property Listing — Sierra Estates | 3-Step Stitch Multi-Sync & Bot Resume',
  description:
    'Submit your property for sale or rent in New Cairo. Auto-extract WhatsApp listings, define Owner/Broker/Agent/Employee role, resume Bot intakes, and sync to Supabase, Google Sheets, and the GIS Map in 1 click.',
};

export default function EasyListingPage() {
  return (
    <SiteShell active={null}>
      <AddListingForm />
    </SiteShell>
  );
}
