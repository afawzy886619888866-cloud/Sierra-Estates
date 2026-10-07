import { Suspense } from 'react';
import type { Metadata } from 'next';
import '../../site-styles/viewing-feedback.css';
import '../../site-styles/site-refinements.css';
import FeedbackForm from './FeedbackForm';

export const metadata: Metadata = {
  title: 'Viewing Feedback',
  description: 'Share how your Sierra Estates viewing went — 30 seconds, no account needed.',
  robots: { index: false, follow: false },
};

/**
 * FeedbackForm reads useSearchParams() (the 48-hex capability token), so it
 * MUST render inside a Suspense boundary — otherwise the static prerender of
 * this route bails out and the whole production build fails
 * (missing-suspense-with-csr-bailout). The form manages its own loading phase,
 * so a null fallback is correct here.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <FeedbackForm />
    </Suspense>
  );
}
