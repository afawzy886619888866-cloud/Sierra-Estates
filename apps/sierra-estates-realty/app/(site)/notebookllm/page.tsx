import type { Metadata } from 'next';
import '../../site-styles/notebookllm.css';
import NotebookLMPage from './NotebookLMPage';

export const metadata: Metadata = {
  title: 'Information Bank — New Cairo Real Estate Intelligence & Unit Advisory | Sierra Estates',
  description:
    'Sierra Estates Information Bank. Comprehensive real estate intelligence for New Cairo and Golden Square. Instant unit matching, price/sqm benchmarks, payment plans, and audio podcasts.',
};

export default function Page() {
  return <NotebookLMPage />;
}
