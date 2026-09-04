export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import '../../site-styles/notebookllm.css';
import NotebookLMPage from '../../(site)/notebookllm/NotebookLMPage';

export const metadata: Metadata = {
  title: 'بنك المعلومات العقاري — عقارات ووحدات القاهرة الجديدة | سييرا العقارية',
  description:
    'بنك معلومات عقارات القاهرة الجديدة والتجمع الخامس من سييرا العقارية. مستشار عقاري ذكي، مطابقة أفضل الوحدات والكمبوندات، مقارنة أسعار المتر، خطط السداد، وبودكاست تحليلي موثق 100%.',
  alternates: {
    canonical: 'https://sierra-estates.net/ar/notebookllm',
  },
};

export default function ArNotebookLMPage() {
  return <NotebookLMPage />;
}
