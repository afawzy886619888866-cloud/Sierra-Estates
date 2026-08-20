/**
 * 404. Inline-styled for the same reason as error.tsx: the client site does not
 * load Tailwind, and this page must look right regardless of which route group
 * the miss came from.
 */
import Link from 'next/link';

const LINKS = [
  { href: '/properties', label: 'Browse listings' },
  { href: '/compounds', label: 'Compounds & map' },
  { href: '/add-listing', label: 'List your unit' },
];

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 24px',
        background: '#0a1622',
        color: '#fff',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: '54ch', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: '#e9c176',
            margin: '0 0 14px',
          }}
        >
          Sierra Estates · 404
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.7rem, 1.2rem + 1.8vw, 2.6rem)',
            fontWeight: 700,
            lineHeight: 1.14,
            margin: '0 0 12px',
          }}
        >
          We couldn&apos;t find that page
        </h1>
        <p style={{ color: 'rgba(255,255,255,.74)', fontSize: 15, margin: '0 0 30px' }}>
          The link may be out of date, or the unit it pointed to has been sold or
          withdrawn. Here&apos;s where most people go next.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              padding: '13px 26px',
              borderRadius: 11,
              background: 'linear-gradient(135deg,#e9c176,#c8961a)',
              color: '#09090f',
              textDecoration: 'none',
              fontSize: 14.5,
              fontWeight: 800,
            }}
          >
            Back to home
          </Link>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: '13px 22px',
                borderRadius: 11,
                border: '1px solid rgba(255,255,255,.24)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 14.5,
                fontWeight: 700,
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
