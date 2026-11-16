'use client';

import React from 'react';
import RequestPage from '../request/page';

/**
 * First-class landing route for /add-request:
 * Gathers complete client property acquisition & rental criteria,
 * syncs to Google Sheets & Supabase, and provides the instant VIP response page.
 */
export default function AddRequestAliasPage() {
  return <RequestPage />;
}
