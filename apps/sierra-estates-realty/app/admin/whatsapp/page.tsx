import type { Metadata } from 'next';
import WhatsAppShell from './WhatsAppShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WhatsApp Command Center · Sierra Estates Admin',
  description: '8-line WhatsApp gateway control — live SIM wall, QR pairing, composer, and outbox.',
};

/**
 * /admin/whatsapp — standalone ITQANE-style control console.
 * Auth is enforced by app/admin/layout.tsx (server-gated session cookie),
 * and every data route re-verifies admin permissions independently.
 */
export default function WhatsAppControlPage() {
  return <WhatsAppShell />;
}
