import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { getRecord, updateRecord, deleteRecord } from '@sierra-estates/db';
import { AUTOMATION_COLLECTIONS } from '@/lib/models/automation';
import { logger } from '@/lib/logger';

const automationUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ar: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  description_ar: z.string().max(1000).optional(),
  trigger: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
  enabled: z.boolean().optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  executionSettings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _req,
  { params }
) {
  const { id } = await params;

  try {
    const rule = await getRecord(AUTOMATION_COLLECTIONS.rules, id);

    if (!rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (err) {
    logger.error('Error fetching automation rule:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch automation rule',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req,
  { params }
) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = automationUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid automation rule payload',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updateData = {
      ...parsed.data,
      updatedBy: authResult.uid,
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await updateRecord(AUTOMATION_COLLECTIONS.rules, id, updateData);

    logger.info(`✓ Updated automation rule: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Automation rule updated',
    });
  } catch (err) {
    logger.error('Error updating automation rule:', err);
    return NextResponse.json(
      {
        error: 'Failed to update automation rule',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req,
  { params }
) {
  const authResult = await verifyAdminRequest(_req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteRecord(AUTOMATION_COLLECTIONS.rules, id);

    logger.info(`✓ Deleted automation rule: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Automation rule deleted',
    });
  } catch (err) {
    logger.error('Error deleting automation rule:', err);
    return NextResponse.json(
      {
        error: 'Failed to delete automation rule',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
