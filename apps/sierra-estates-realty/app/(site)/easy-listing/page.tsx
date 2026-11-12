import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import EasyListingStudio from '@/components/admin/EasyListingStudio';

export const metadata: Metadata = {
  title: 'Easy Listing Studio · Sierra Estates',
  description:
    'Instant luxury listing creator and AI copy generator — publish your property directly to Sierra Estates inventory.',
};

export default function EasyListingPublicPage() {
  return (
    <SiteShell active={null}>
      <div style={{ paddingTop: 88, paddingBottom: 64 }} className="min-h-screen bg-[#070b12] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <EasyListingStudio />
        </div>
      </div>
    </SiteShell>
  );
}
