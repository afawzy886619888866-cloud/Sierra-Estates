'use client';

import React from 'react';

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 40, fontFamily: 'system-ui, sans-serif', background: '#0a1622', color: '#fff', textAlign: 'center' }}>
        <h2>Something went wrong!</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>A system error occurred.</p>
        <button
          onClick={() => reset()}
          style={{ padding: '10px 20px', background: '#e9c176', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
