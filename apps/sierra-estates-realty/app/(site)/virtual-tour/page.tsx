import type { Metadata } from 'next';
import '../../site-styles/virtual-tour.css';
import '../../site-styles/site-refinements.css';
import VirtualTourPage from './VirtualTourPage';

export const metadata: Metadata = {
  title: '3D Virtual Tour',
  description:
    'Walk through Sierra Estates’ signature New Cairo units in cinematic 4K — room by room, VR-ready, with a measured floor plan.',
};

export default function Page() {
  return <VirtualTourPage />;
}
