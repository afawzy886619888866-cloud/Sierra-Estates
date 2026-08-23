'use client';

/**
 * Route-segment error boundary.
 *
 * Styled with the site's own tokens rather than utility classes — the client
 * site does not load Tailwind, so utility classes would render unstyled here,
 * which is exactly when you cannot afford a broken-looking page.
 */
import React, { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    if (error) {
      console.error('[route-error]', error);
    }
  }, [error]);

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
      <div style={{ maxWidth: '52ch', textAlign: 'center' }}>
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
          Sierra Estates
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.6rem, 1.2rem + 1.6vw, 2.4rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            margin: '0 0 12px',
          }}
        >
          Something went wrong
        </h1>
        <p style={{ color: 'rgba(255,255,255,.74)', fontSize: 15, margin: '0 0 28px' }}>
          The page hit an unexpected error. Trying again usually clears it — if it
          keeps happening, our team is one message away.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '13px 26px',
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg,#e9c176,#c8961a)',
              color: '#09090f',
              fontFamily: 'inherit',
              fontSize: 14.5,
              fontWeight: 800,
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: '13px 26px',
              borderRadius: 11,
              border: '1px solid rgba(255,255,255,.24)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14.5,
              fontWeight: 700,
            }}
          >
            Back to home
          </a>
        </div>

        {error.digest && (
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'rgba(255,255,255,.4)',
              marginTop: 26,
            }}
          >
            Reference {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
