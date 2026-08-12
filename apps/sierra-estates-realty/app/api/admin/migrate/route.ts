/**
 * Admin Data Migration API Endpoint
 * Provides REST API for triggering and monitoring data migrations
 *
 * POST /api/admin/migrate - Run all migrations
 * GET /api/admin/migrate/status - Get migration status
 *
 * Requires: Admin role + Firebase auth token
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin';
import {
  runMigrations,
  validateMigration,
} from '@/lib/migration/migrateAdminData';

// Migration status storage (in production, use Firestore or Redis)
let migrationInProgress = false;
let lastMigrationResult: any = null;

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminRequest(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // Check if migration is already running
    if (migrationInProgress) {
      return NextResponse.json(
        { error: 'Migration already in progress. Please wait.' },
        { status: 409 }
      );
    }

    const { action = 'run', dryRun = false } = await req.json();

    if (action === 'run') {
      migrationInProgress = true;

      try {
        // Run migrations
        const result = await runMigrations(dryRun);

        lastMigrationResult = {
          ...result,
          initiatedBy: authResult.userId || 'unknown',
          dryRun,
          completedAt: new Date().toISOString(),
        };

        // Log migration to audit trail
        console.log('[Admin Migration]', {
          user: authResult.userId || 'unknown',
          status: result.success ? 'success' : 'failed',
          recordsMigrated: result.results.reduce(
            (sum, r) => sum + r.recordsMigrated,
            0
          ),
          errors: result.results.reduce(
            (sum, r) => sum + r.errors.length,
            0
          ),
          dryRun,
        });

        return NextResponse.json(
          {
            success: result.success,
            message: dryRun
              ? 'Dry run completed. No data was modified.'
              : 'Migration completed successfully',
            results: result.results,
            validation: result.validation,
            completedAt: result.executedAt,
          },
          { status: result.success ? 200 : 207 }
        );
      } catch (error) {
        console.error('[Admin Migration Error]', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Migration failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      } finally {
        migrationInProgress = false;
      }
    } else if (action === 'validate') {
      // Validate current data state
      const validation = await validateMigration();

      return NextResponse.json({
        valid: validation.valid,
        issues: validation.issues,
        validatedAt: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "run" or "validate".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Admin Migration API Error]', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminRequest(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      return NextResponse.json({
        migrationInProgress,
        lastMigration: lastMigrationResult || null,
        timestamp: new Date().toISOString(),
      });
    } else if (action === 'validate') {
      const validation = await validateMigration();

      return NextResponse.json({
        valid: validation.valid,
        issues: validation.issues,
        totalIssues: validation.issues.length,
        validatedAt: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "status" or "validate".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Admin Migration API Error]', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
