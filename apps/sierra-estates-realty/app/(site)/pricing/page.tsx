import type { Metadata } from 'next';
import '../../site-styles/pricing.css';
import '../../site-styles/site-refinements.css';
import PricingPage from './PricingPage';

export const metadata: Metadata = {
  title: 'AVM Pricing Engine',
  description: 'Value a New Cairo unit against live comparables — compound, type, area and finishing.',
};

export default function Page() {
  return <PricingPage />;
}
