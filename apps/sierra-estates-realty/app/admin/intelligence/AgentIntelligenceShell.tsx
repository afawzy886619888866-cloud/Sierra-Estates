'use client';

import dynamic from 'next/dynamic';

// ssr:false, matching app/admin/AdminPageShell.tsx's pattern for the main
// portal - avoids Next.js generating a static prerendered shell alongside
// the dynamic function for this route, which Vercel's builder can't
// reconcile ("Unable to find lambda for route: ...").
const AgentIntelligence = dynamic(() => import('./AgentIntelligence'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100vh', background: '#0a0e1a' }} />,
});

export default function AgentIntelligenceShell() {
  return <AgentIntelligence />;
}
