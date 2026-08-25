'use client';

import dynamic from 'next/dynamic';

// ssr:false (matching app/admin/AdminPageShell.tsx's pattern for the main
// portal) - Next.js was otherwise generating BOTH a static prerendered shell
// (login.html/.rsc) AND a dynamic serverless function for this route despite
// `export const dynamic = 'force-dynamic'`, and Vercel's builder couldn't
// resolve the ambiguity ("Unable to find lambda for route: /admin/login").
// Rendering client-only avoids the static shell entirely.
const LoginForm = dynamic(() => import('./LoginForm'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100vh', background: '#07111E' }} />,
});

export default function AdminLoginPage() {
  return <LoginForm />;
}
