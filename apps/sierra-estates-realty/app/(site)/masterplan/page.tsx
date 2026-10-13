import type { Metadata } from 'next';
import MasterplanPortal from '../../client/MasterplanPortal';

export const metadata: Metadata = {
  title: 'Interactive 3D Masterplan & GIS Explorer · New Cairo',
  description:
    'Explore Fifth Settlement (New Cairo) cadastral masterplan intelligence in interactive 3D and orthographic 2D with live inventory benchmarks.',
  openGraph: {
    title: 'Interactive 3D Masterplan & GIS Explorer · Sierra Estates',
    description:
      'Explore Fifth Settlement (New Cairo) cadastral masterplan intelligence in interactive 3D with live compound valuations.',
  },
};

export default function MasterplanPage() {
  return <MasterplanPortal />;
}
