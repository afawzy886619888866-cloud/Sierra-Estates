import type { Metadata } from 'next';
import AppsShell from './AppsShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Applications Control · Sierra Estates Admin',
  description: 'One control page for every Sierra Estates application — local WhatsApp gateway, workflow runner, and cloud services.',
};

/**
 * /admin/apps — ITQANE-style applications control console.
 * Auth is enforced by app/admin/layout.tsx (server-gated session cookie),
 * and every data route re-verifies admin permissions independently.
 */
export default function AppsControlPage() {
  return <AppsShell />;
}
