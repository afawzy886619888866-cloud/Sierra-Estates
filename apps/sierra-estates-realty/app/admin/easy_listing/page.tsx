import type { Metadata } from 'next';
import AddListingForm from '@/components/client/AddListingForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Easy Listing Studio & Bot Intakes · Sierra Estates Admin',
  description: 'AI-assisted listing parser, property brochure builder, and bot intakes manager.',
};

export default function EasyListingPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-white p-6">
      <AddListingForm isAdmin={true} />
    </div>
  );
}
