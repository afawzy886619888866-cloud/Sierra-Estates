import type { Metadata } from 'next';
import '../../site-styles/notebookllm.css';
import NotebookLMPage from './NotebookLMPage';

export const metadata: Metadata = {
  title: 'Google NotebookLM Studio · Grounded Real Estate Intelligence',
  description:
    'Sierra Estates Google NotebookLM Grounded Research Studio. Strict source-grounded real estate synthesis, 2-host audio overview deep dive podcasts, and executive investment study guides.',
};

export default function Page() {
  return <NotebookLMPage />;
}
