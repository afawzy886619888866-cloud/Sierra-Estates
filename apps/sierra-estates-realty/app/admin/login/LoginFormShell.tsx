'use client';

import dynamic from 'next/dynamic';

// ssr:false — Next.js was otherwise generating BOTH a static prerendered shell
// AND a dynamic serverless function for this route despite
// `export const dynamic = 'force-dynamic'` on the page itself. Rendering
// client-only avoids the static shell entirely.
//
// The loading skeleton below mirrors the real LoginForm layout so the page
// feels instant while the JS bundle loads — no more blank dark screen.
const LoginForm = dynamic(() => import('./LoginForm'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(900px 600px at 85% 0%, rgba(0,174,255,.10), transparent 60%), #07111E',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255,255,255,.055)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.22em',
              background: 'linear-gradient(135deg, #d4af37, #f5d76e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SIERRA ESTATES 3.0
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '.18em',
              color: 'rgba(240,237,229,.32)',
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            Intelligence OS · Staff Portal
          </div>
        </div>

        {/* Google button skeleton */}
        <div
          style={{
            width: '100%',
            height: 46,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.18)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
            marginBottom: 20,
          }}
        />

        {/* Divider skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            color: 'rgba(240,237,229,0.3)',
            fontSize: 11,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span>Loading… / جاري التحميل</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Input skeletons */}
        <div
          style={{
            height: 38,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 38,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 20,
          }}
        />

        {/* Submit skeleton */}
        <div
          style={{
            width: '100%',
            height: 42,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #00AEFF, #5FC9FF)',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  ),
});

export default function LoginFormShell() {
  return <LoginForm />;
}
