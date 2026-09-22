export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import '../../site-styles/career.css';
import CareerPage from '../../(site)/career/CareerPage';

export const metadata: Metadata = {
  title: 'وظائف المبيعات والإدارة العقارية · Sierra Estates Careers',
  description:
    'انضم إلى فريق Sierra Estates في التجمع الخامس. وظائف شاغرة في المبيعات العقارية والشؤون الإدارية والعمليات والـ CRM بعمولات ومزايا مجزية.',
  alternates: {
    canonical: 'https://sierra-estates.net/ar/careers',
  },
};

export default function ArCareersAliasPage() {
  return <CareerPage />;
}
