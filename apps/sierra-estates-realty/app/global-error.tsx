'use client';

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: '100vh', padding: '4rem', background: '#0b1118', color: '#f6f1e8', fontFamily: 'Arial, sans-serif' }}>
          <h1>Sierra Estates</h1>
          <p>Something went wrong. Please refresh the page or return home.</p>
          <a href="/" style={{ color: '#d6b46a' }}>Return home</a>
        </main>
      </body>
    </html>
  );
}
