import type { Metadata } from 'next';
import '../../site-styles/ai-engine.css';
import '../../site-styles/site-refinements.css';
import AiEnginePage from './AiEnginePage';

export const metadata: Metadata = {
  title: 'Intelligence Engine',
  description: 'Six engines over one live dataset — pricing, matching, return, and spatial intelligence.',
};

export default function Page() {
  return <AiEnginePage />;
}
