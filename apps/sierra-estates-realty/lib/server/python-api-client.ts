import 'server-only';
import { logger } from '@/lib/logger';

const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL;

export interface PortfolioAssetPayload {
  id: string;
  title_en?: string | null;
  title_ar?: string | null;
  price?: number | null;
  location?: string | null;
}

export interface PythonApiHealth {
  reachable: boolean;
  status?: string;
  service?: string;
  error?: string;
}

export interface PythonApiSyncResult {
  success: boolean;
  syncStatus?: string;
  syncedCount?: number;
  errors?: string[];
  error?: string;
}

/**
 * Pings the apps/api Python service (PropertyFinder sync + bot integration,
 * Docker/Cloud Run — see CLAUDE.md). No-ops when PYTHON_API_BASE_URL isn't
 * configured, mirroring the graceful-degradation pattern used elsewhere in lib/server.
 */
export async function checkPythonApiHealth(): Promise<PythonApiHealth> {
  if (!PYTHON_API_BASE_URL) {
    logger.warn('⚠️ [python-api] PYTHON_API_BASE_URL not configured — health check skipped');
    return { reachable: false, error: 'PYTHON_API_BASE_URL not configured' };
  }

  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}/health`);
    if (!response.ok) {
      return { reachable: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { reachable: true, status: data.status, service: data.service };
  } catch (error) {
    logger.error('❌ [python-api] Health check failed:', error);
    return { reachable: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Delegates a batch PropertyFinder sync to the apps/api Python service's
 * POST /property-finder/sync route.
 */
export async function syncPortfolioAssetsViaPythonApi(
  assets: PortfolioAssetPayload[]
): Promise<PythonApiSyncResult> {
  if (!PYTHON_API_BASE_URL) {
    logger.warn('⚠️ [python-api] PYTHON_API_BASE_URL not configured — sync skipped');
    return { success: false, error: 'PYTHON_API_BASE_URL not configured' };
  }

  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}/property-finder/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      logger.error(`❌ [python-api] Sync failed (${response.status}): ${errText}`);
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    const data = await response.json();
    return {
      success: data.sync_status === 'success',
      syncStatus: data.sync_status,
      syncedCount: data.synced_count,
      errors: data.errors,
    };
  } catch (error) {
    logger.error('❌ [python-api] Sync request failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
