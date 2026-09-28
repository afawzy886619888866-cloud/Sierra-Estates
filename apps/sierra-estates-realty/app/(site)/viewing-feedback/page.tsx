import type { Metadata } from 'next';
import '../../site-styles/viewing-feedback.css';
import '../../site-styles/site-refinements.css';
import FeedbackForm from './FeedbackForm';

export const metadata: Metadata = {
  title: 'Viewing Feedback',
  description: 'Share how your Sierra Estates viewing went — 30 seconds, no account needed.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FeedbackForm />;
}
