'use client';

/**
 * Root-layout error boundary — the last line of defence.
 *
 * This replaces the root layout entirely when it fires, so it must render its
 * own <html> and <body>. No stylesheet is guaranteed to have loaded at this
 * point, so every style is inline.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '48px 24px',
            background: '#0a1622',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          <div style={{ maxWidth: '52ch', textAlign: 'center' }}>
            <p
              style={{
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
            <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15, margin: '0 0 12px' }}>
              This page could not be loaded
            </h1>
            <p style={{ color: 'rgba(255,255,255,.74)', fontSize: 15, margin: '0 0 28px' }}>
              Something failed before the page could start. Reloading usually fixes it.
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
                Reload
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
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 26 }}>
                Reference {error.digest}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
