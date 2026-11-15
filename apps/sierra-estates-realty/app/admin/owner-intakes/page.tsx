import type { Metadata } from 'next';
import AddListingForm from '@/components/client/AddListingForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Owner Intakes & Bot Resume · Sierra Estates Admin',
  description: 'Manage WhatsApp bot intakes, owner "yes available" replies, and multi-sync publishing.',
};

export default function AdminOwnerIntakesPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-white p-6">
      <AddListingForm isAdmin={true} />
    </div>
  );
}
