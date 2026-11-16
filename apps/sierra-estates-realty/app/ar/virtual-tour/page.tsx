export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import '../../site-styles/virtual-tour.css';
import '../../site-styles/site-refinements.css';
import VirtualTourPage from '../../(site)/virtual-tour/VirtualTourPage';

export const metadata: Metadata = {
  title: 'جولة افتراضية ثلاثية الأبعاد · 3D Virtual Tour · Sierra Estates',
  description:
    'عش تجربة المعاينة الحية بدقة 4K لوحدات القاهرة الجديدة والمربع الذهبي مع سييرا إستيتس — تجول داخل الغرف والمخططات الهندسية مع مستشارك العقاري.',
  alternates: {
    canonical: 'https://sierra-estates.net/ar/virtual-tour',
  },
};

export default function ArVirtualTourPage() {
  return <VirtualTourPage />;
}
