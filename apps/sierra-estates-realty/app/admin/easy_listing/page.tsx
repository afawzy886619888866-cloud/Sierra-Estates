import type { Metadata } from 'next';
import EasyListingStudio from '@/components/admin/EasyListingStudio';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Easy Listing Studio · Sierra Estates Admin',
  description: 'AI-assisted listing parser, property brochure builder, and social teaser generator.',
};

export default function EasyListingPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-white p-6">
      <EasyListingStudio />
    </div>
  );
}
