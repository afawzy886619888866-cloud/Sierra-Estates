import 'server-only';
import { getRecord, listRecords } from '@sierra-estates/db';

/**
 * Server-only inventory reads through the Supabase service-role client.
 * Client-side code should call /api/listings rather than importing this file:
 * this bypasses RLS by design, on the same admin-trust model every other
 * app/api/ route uses.
 */

 





















export const InventoryService = {
  async getProperty(id) {
    return await getRecord('listings', id);
  },

  async getFeaturedListings(count = 3) {
    return await listRecords('listings', { limit: count });
  },
};
