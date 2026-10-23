import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import BrokerBrainPage from './BrokerBrainPage';

export const metadata: Metadata = {
  title: 'Broker Intelligence',
  description:
    'Sierra Estates broker intelligence desk — instant owner profiles, pricing context, and listing matches for New Cairo compounds.',
  icons: { icon: '/assets/logo-mark-96.png' },
};

export default function BrokerPage() {
  return (
    <SiteShell active={null}>
      <div style={{ paddingTop: 88, paddingBottom: 64 }}>
        <BrokerBrainPage />
      </div>
    </SiteShell>
  );
}
