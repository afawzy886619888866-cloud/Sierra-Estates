import './command-center.css';
import CommandCenterOverview from '@/components/admin/command-center/CommandCenterOverview';

export const metadata = {
  title: 'Sierra Estates · Unified Admin Command Center',
  description:
    'The unified operational hub — deals, leads, inventory freshness, AI agent fleet and recruitment in one console.',
};

export const dynamic = 'force-dynamic';

/**
 * MAIN OVERVIEW DASHBOARD of the Unified Admin Command Center.
 *
 * Route history: /admin used to render the full Intelligence OS portal
 * directly (AdminPortal). The portal moved to /admin/console when the
 * command-center hub landed — this page is now the spec's overview dashboard
 * (five KPI widgets + command navigation), and every operational surface is
 * one click away:
 *
 *   /admin/pipeline    CRM 10-stage board (Realtime CDC)
 *   /admin/properties  Inventory & freshness control
 *   /admin/leads       Leads & AI matchmaker hub
 *   /admin/bots        AI COO & 10-bot operations desk
 *   /admin/applicants  Recruitment & applicant management
 *   /admin/console     The full legacy Intelligence OS portal
 */
export default function AdminPage() {
  return <CommandCenterOverview />;
}
