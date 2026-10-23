import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Broker Brain | Sierra Estates — New Cairo Market Intelligence',
  description: 'Chat with Samir, your personal AI real estate broker. 11,488 live units across New Cairo, direct owner deals, instant valuations and market intelligence.',
  openGraph: {
    title: 'Sierra Estates AI Broker — New Cairo Market Intelligence',
    description: 'Real-time AI broker with knowledge of 11,488 units, pricing, cap rates and direct owner deals.',
  },
};

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
