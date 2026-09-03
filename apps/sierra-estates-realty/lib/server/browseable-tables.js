/**
 * Tables the raw DB browser (/api/admin/db/:collection) may address.
 *
 * Under Firestore the route took any collection name and relied on a denylist
 * of three secret collections. That denylist named Firestore collections which
 * do not exist in Postgres, so after the migration it protected nothing, and an
 * arbitrary string was being passed straight through as a table name.
 *
 * An allowlist replaces it. Membership here does NOT relax the route's other
 * gates: it still requires verifyAdminRequest plus `role === 'superadmin'`,
 * which is what actually authorises reading `profiles` or `contracts`. This
 * list only bounds *which* names may be addressed at all.
 *
 * Deliberately excluded: system_config and system_metrics, which are written
 * by the service role and carry no rows a human needs to browse.
 */
export const BROWSEABLE_TABLES = new Set([
  'activities',
  'agent_executions',
  'agents_registry',
  'audit_logs',
  'automation_execution_logs',
  'automation_rules',
  'bot_commands',
  'broker_listings',
  'career_applications',
  'compounds',
  'concierge_selections',
  'contracts',
  'deals',
  'failed_orchestrations',
  'followups',
  'inquiries',
  'knowledge_base',
  'leads',
  'listings',
  'owner_negotiations',
  'owners',
  'pages',
  'profiles',
  'proposals',
  'sales',
  'search_queries',
  'session_buffer_logs',
  'strategic_pipeline',
  'system_status',
  'unified_memory',
  'viewing_appointments',
  'viewing_requests',
  'viewings',
  'whatsapp_queue',
  'workflow_executions',
  'workflows',
]);

export function isBrowseableTable(name) {
  return BROWSEABLE_TABLES.has(name);
}
