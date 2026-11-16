export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import '../site-styles/index.css';
import '../site-styles/site-refinements.css';
import HomePage from '../(site)/HomePage';

export const metadata: Metadata = {
  title: 'سييرا إستيتس · عقارات القاهرة الجديدة الفاخرة',
  description: 'منصة سييرا إستيتس العقارية الذكية — التجمع الخامس، مدينتي، والرحاب.',
};

export default function ArabicPage() {
  return <HomePage />;
}
