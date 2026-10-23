/**
 * Single owner of database access for the automation scripts.
 *
 * Previously each script (01-whatsapp-scraper, 03-owner-contact,
 * 04-email-sender, 05-unit-adder) copy-pasted a Firebase Admin init block
 * independently, with warning messages that had already started to drift
 * between copies. That indirection is no longer needed — the record layer in
 * @sierra-estates/db resolves its own client — so this module exists only to
 * keep one place for the credential warning these standalone workers need,
 * since they run outside the Next.js app and its env loading.
 */
import { getSupabaseAdmin } from '@sierra-estates/db';

export { insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
export * from './reliability';

/**
 * Fail loudly at startup rather than on the first write.
 *
 * Returns false when Supabase is not configured, so a worker can log and skip
 * instead of throwing mid-run. getSupabaseAdmin() refuses to fall back to the
 * anon key, so a missing service-role key is a hard stop, not a silent
 * downgrade to "no data".
 */
export function assertDbConfigured(label: string): boolean {
  try {
    getSupabaseAdmin();
    return true;
  } catch (error) {
    console.warn(
      `[${label}] Supabase is not configured: ${(error as Error).message} ` +
        'Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
    );
    return false;
  }
}
