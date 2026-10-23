/**
 * sierra estates — PYTHON SERVICE HEALTH CHECK
 * Pings the apps/api Python service (PropertyFinder sync + bot integration).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { checkPythonApiHealth } from '@/lib/server/python-api-client';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const health = await checkPythonApiHealth();
  return NextResponse.json(health, { status: health.reachable ? 200 : 503 });
}
