'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a1622', color: '#fff', display: 'grid', minHeight: '100vh', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, margin: '0 0 12px' }}>Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' }}>A critical error occurred while loading Sierra Estates.</p>
          <button
            onClick={() => reset()}
            style={{ padding: '12px 24px', background: '#e9c176', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
          >
            Try again
          </button>
          {error?.digest && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>
              Reference {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
