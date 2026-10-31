import '../command-center.css';
import LeadsConsole from '@/components/admin/command-center/LeadsConsole';

export const metadata = {
  title: 'Leads & AI Matchmaker · Sierra Estates Command Center',
  description: 'Lead scoring, semantic property matching and recommendation dispatch.',
};

export const dynamic = 'force-dynamic';

/**
 * LEADS & AI MATCHMAKER HUB — the demand book with lead_score, the
 * /api/matching trigger (semantic property matching over the inventory) and
 * the curated WhatsApp recommendation dispatch.
 */
export default function LeadsPage() {
  return <LeadsConsole />;
}
