import type { Metadata } from 'next';
<<<<<<< HEAD
=======
import SiteShell from '@/components/site/SiteShell';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
import AddListingForm from '@/components/client/AddListingForm';

export const metadata: Metadata = {
  title: 'Add a Listing',
  description:
    'List your unit with Sierra Estates — verified in 24 hours, priced against live New Cairo comparables, and put in front of matched buyers and tenants.',
  icons: { icon: '/assets/logo-mark-96.png' },
};

export default function AddListingPage() {
<<<<<<< HEAD
  return <AddListingForm />;
=======
  return (
    <SiteShell active={null}>
      <div style={{ paddingTop: 88, paddingBottom: 64 }}>
        <AddListingForm />
      </div>
    </SiteShell>
  );
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
}
