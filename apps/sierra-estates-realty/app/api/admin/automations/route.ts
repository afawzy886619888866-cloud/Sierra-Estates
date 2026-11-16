import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, insertRecord } from '@sierra-estates/db';
import { AUTOMATION_COLLECTIONS } from '@/lib/models/automation';
import { logger } from '@/lib/logger';

const automationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  description_ar: z.string().max(1000).optional(),
  templateId: z.string().optional(),
  trigger: z.object({
    type: z.enum(['lead_created', 'property_viewed', 'status_changed', 'price_changed', 'time_based', 'manual']),
    statusChangeFrom: z.string().optional(),
    statusChangeTo: z.string().optional(),
    priceThreshold: z.number().optional(),
    delayMinutes: z.number().optional(),
    recurringCron: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    propertyTypes: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    leadMinScore: z.number().optional(),
  }),
  actions: z.array(z.record(z.string(), z.unknown())),
  enabled: z.boolean().default(true),
  conditions: z.object({
    minLeadScore: z.number().optional(),
    minPropertyValue: z.number().optional(),
    maxPropertyValue: z.number().optional(),
    requiresApproval: z.boolean().optional(),
  }).optional(),
  executionSettings: z.object({
    maxExecutionsPerDay: z.number().optional(),
    delayBetweenActionsSeconds: z.number().optional(),
    retryOnFailure: z.boolean().optional(),
    maxRetries: z.number().optional(),
  }).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rules = await listRecords(AUTOMATION_COLLECTIONS.rules);

    return NextResponse.json({
      success: true,
      rules,
      count: rules.length,
    });
  } catch (err) {
    logger.error('Error fetching automation rules:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch automation rules',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = automationCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid automation rule payload',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, name_ar, description, description_ar, templateId, trigger, actions, enabled, conditions, executionSettings } = parsed.data;

    const ref = await insertRecord<{ id: string }>(AUTOMATION_COLLECTIONS.rules, {
      name,
      name_ar: name_ar || '',
      description: description || '',
      description_ar: description_ar || '',
      templateId: templateId || null,
      trigger,
      actions,
      enabled,
      conditions: conditions || {},
      executionSettings: executionSettings || {},
      stats: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        lastExecutedAt: null,
        nextScheduledAt: null,
      },
      createdBy: authResult.uid,
      updatedBy: authResult.uid,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.info(`✓ Created automation rule: ${ref.id} (${name})`);

    return NextResponse.json({
      success: true,
      ruleId: ref.id,
    });
  } catch (err) {
    logger.error('Error creating automation rule:', err);
    return NextResponse.json(
      {
        error: 'Failed to create automation rule',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
