export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import '../../site-styles/advice.css';
import '../../site-styles/site-refinements.css';
import AdvicePage from './AdvicePage';

export const metadata: Metadata = {
  title: 'Dream Home Advisor',
  description: 'Tell us what matters most and Sierra shortlists three New Cairo units, with the reasoning behind each.',
};

export default function Page() {
  return <AdvicePage />;
}
