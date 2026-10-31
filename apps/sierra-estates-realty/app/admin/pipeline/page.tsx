import '../command-center.css';
import PipelineBoard from '@/components/admin/command-center/PipelineBoard';

export const metadata = {
  title: 'CRM Pipeline · Sierra Estates Command Center',
  description: 'The 10-stage demand funnel with drag-and-drop and Supabase Realtime CDC.',
};

export const dynamic = 'force-dynamic';

/**
 * CRM 10-STAGE PIPELINE BOARD.
 *
 * Leads move across the canonical pipeline_stage vocabulary (lib/crm-stages)
 * with @hello-pangea/dnd; every mutation is audited DB-side and the board
 * re-syncs from the `leads` + `deals` postgres_changes streams. Deal chips on
 * each card link straight into the Property and Lead detail modals.
 */
export default function PipelinePage() {
  return <PipelineBoard />;
}
