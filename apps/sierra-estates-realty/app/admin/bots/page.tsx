import '../command-center.css';
import BotsDesk from '@/components/admin/command-center/BotsDesk';

export const metadata = {
  title: 'AI COO · Bot Operations · Sierra Estates Command Center',
  description: 'The 10-bot fleet, webhook ledger, raw scrape data and manual agent workflows.',
};

export const dynamic = 'force-dynamic';

/**
 * AI COO & 10-BOT OPERATIONS DESK — fleet heartbeats (system_status), the
 * live webhook ledger (/api/webhooks/whatsapp + /api/telegram/webhook), the
 * raw scrape inspector (raw_feed) and manual Scribe / Curator / Stage-9
 * Closer / Matchmaker execution (/api/admin/bots/run).
 */
export default function BotsPage() {
  return <BotsDesk />;
}
