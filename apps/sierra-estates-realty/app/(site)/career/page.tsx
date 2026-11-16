import type { Metadata } from 'next';
import '../../site-styles/career.css';
import CareerPage from './CareerPage';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Join Sierra Estates — where AI meets luxury property in New Cairo. Open roles across sales, engineering, marketing, and operations.',
};

export default function Page() {
  return <CareerPage />;
}
