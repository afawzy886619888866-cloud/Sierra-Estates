import { Metadata } from 'next';
import '../../site-styles/notebookllm.css';
import NotebookLMPage from '../../(site)/notebookllm/NotebookLMPage';

export const metadata: Metadata = {
  title: 'استوديو نوت بوك إل إم العقاري الذكي · Google NotebookLM Studio',
  description:
    'استوديو الأبحاث العقارية الموثقة من سييرا العقارية المدعوم بـ Google NotebookLM. إجابات موثقة بالمصادر 100%، توليد بودكاست صوتي ذكي (Audio Overview)، وملخصات تنفيذية للماستر إنفنتوري وكايرو بلازا.',
  alternates: {
    canonical: 'https://sierra-estates.net/ar/notebookllm',
  },
};

export default function ArNotebookLMPage() {
  return <NotebookLMPage />;
}
