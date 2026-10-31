import AdminPageShell from '../AdminPageShell';

export const metadata = {
  title: 'Sierra Estates 3.0 · Intelligence OS · Admin',
};

export const dynamic = 'force-dynamic';

/**
 * LEGACY INTELLIGENCE OS PORTAL.
 *
 * This is the full admin portal that used to live at /admin (AdminPortal with
 * its tabbed views — workflows, viewings, contracts, memory brain, ...). It
 * moved here when the Unified Admin Command Center hub took over /admin;
 * nothing about the portal itself changed. Reached from the command center's
 * "Intelligence OS Console" navigation card and the sign-in flow.
 */
export default function AdminConsolePage() {
  return <AdminPageShell />;
}
