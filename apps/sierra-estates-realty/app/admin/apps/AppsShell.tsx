'use client';

import dynamic from 'next/dynamic';

// ssr:false, matching app/admin/intelligence/AgentIntelligenceShell.tsx and
// app/admin/AdminPageShell.tsx — avoids Next.js generating a static prerendered
// shell alongside the dynamic function for this route, which Vercel's builder
// can't reconcile ("Unable to find lambda for route: ...").
const AppsControlCenter = dynamic(() => import('./AppsControlCenter'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0e27',
        color: '#8b96ad',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        letterSpacing: '0.08em',
      }}
    >
      Applications Control Center…
    </div>
  ),
});

export default function AppsShell() {
  return <AppsControlCenter />;
}
