import type { Metadata } from 'next';
import '../../site-styles/career.css';
import CareerPage from '../career/CareerPage';

export const metadata: Metadata = {
  title: 'Careers · Sierra Estates Luxury PropTech',
  description:
    'Join Sierra Estates — where AI meets luxury property in New Cairo. Open roles across sales advisory, operations, engineering, and brokerage.',
  alternates: {
    canonical: 'https://sierra-estates.net/careers',
  },
};

export default function CareersAliasPage() {
  return <CareerPage />;
}
