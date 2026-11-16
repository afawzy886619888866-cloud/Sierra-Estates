import type { Metadata } from 'next';
import '../../site-styles/compounds.css';
import '../../site-styles/site-refinements.css';
import CompoundsPage from './CompoundsPage';

export const metadata: Metadata = {
  title: 'Compounds & Map',
  description:
    'Live intelligence across 50+ New Cairo, Madinaty and Shorouk compounds — benchmarked by AI score, growth and average price.',
};

export default function Page() {
  return <CompoundsPage />;
}
