import type { Metadata } from 'next';
import SierraMasterRegistryApp from '@/components/MasterRegistryMap/SierraMasterRegistryApp';

export const metadata: Metadata = {
  title: 'New Cairo City Master Registry · Sierra Estates',
  description:
    'Bilingual Light & Dark Ultra-HD Master Registry of New Cairo City (Fifth Settlement & Golden Square) with interactive compound cartography, live units inventory, unit comparisons, and rental yield analytics.',
  openGraph: {
    title: 'New Cairo City Master Registry · Sierra Estates',
    description:
      'Interactive New Cairo cartographic master registry, Golden Square unit inventory with side-by-side comparison, 3D architectural twin, and rental yield heatmap.',
  },
};

export default function MasterplanPage() {
  return <SierraMasterRegistryApp />;
}
