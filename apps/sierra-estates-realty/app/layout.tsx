import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sierra Estates - Luxury Real Estate New Cairo',
  description: 'Discover premium properties in New Cairo with Sierra Estates',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the admin portal stamps data-theme/dir on <html>
    // from localStorage after hydration.
    <html lang="en" data-theme="light" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700;800;900&family=Cairo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
