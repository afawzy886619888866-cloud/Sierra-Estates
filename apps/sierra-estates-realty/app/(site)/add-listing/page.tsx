import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono, Cairo } from 'next/font/google';
import AddListingForm from '@/components/client/AddListingForm';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-playfair',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Add a Listing',
  description:
    'List your unit with Sierra Estates — verified in 24 hours, priced against live New Cairo comparables, and put in front of matched buyers and tenants.',
  icons: { icon: '/assets/logo-mark-96.png' },
};

export default function AddListingPage() {
  return (
    <div className={`${jakarta.variable} ${playfair.variable} ${jetbrains.variable} ${cairo.variable}`}>
      <AddListingForm />
    </div>
  );
}
