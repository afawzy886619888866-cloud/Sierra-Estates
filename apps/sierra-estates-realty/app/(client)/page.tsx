import type { Metadata } from 'next';
import ClientHome from '../ClientHome';

export const metadata: Metadata = {
  title: 'Sierra Estates · New Cairo Properties — Rent & Resale',
  description:
    'Sierra Estates — AI-curated rent and resale properties across 50+ New Cairo compounds. Verified listings, live AVM pricing, licensed brokers.',
  alternates: { canonical: 'https://sierra-estates.net/' },
  openGraph: {
    type: 'website',
    title: 'Sierra Estates · New Cairo Properties',
    description:
      'AI-curated rent and resale properties across 50+ New Cairo compounds. Verified listings, live AVM pricing, licensed brokers.',
    url: 'https://sierra-estates.net/',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=80',
      },
    ],
  },
  twitter: { card: 'summary_large_image' },
  other: {
    'application-ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: 'Sierra Estates',
      url: 'https://sierra-estates.net/',
      telephone: '+2 01092048333',
      email: 'Info@sierra-estates.net',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Banafseg 2, Villa 402',
        addressLocality: 'New Cairo',
        addressCountry: 'EG',
      },
      areaServed: [
        'New Cairo',
        '5th Settlement',
        'Katameya',
        'Madinaty',
        'El Shorouk',
        'Mostakbal City',
      ],
    }),
  },
};

export default function ClientHomePage() {
  return <ClientHome />;
}
