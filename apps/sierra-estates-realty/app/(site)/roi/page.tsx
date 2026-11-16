import type { Metadata } from 'next';
import '../../site-styles/roi.css';
import '../../site-styles/site-refinements.css';
import RoiPage from './RoiPage';

export const metadata: Metadata = {
  title: 'ROI Forecaster',
  description: 'Rank New Cairo compounds by projected return — capital growth plus rental yield.',
};

export default function Page() {
  return <RoiPage />;
}
