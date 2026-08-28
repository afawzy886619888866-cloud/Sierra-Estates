/**
 * /api/admin/aws — EC2 instance & Lambda function control
 *
 * Admin-only. Backed by @workspace/aws (lib/integrations/aws), which wraps
 * the AWS SDK v3 EC2 and Lambda clients using AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY / AWS_REGION (see .env.example).
 *
 *   - GET:  list EC2 instances and Lambda functions
 *   - POST: { action: 'ec2-start' | 'ec2-stop', instanceId }
 *           { action: 'lambda-invoke', functionName, payload? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import {
  listInstances,
  startInstance,
  stopInstance,
  invokeLambda,
  listFunctions,
} from '@workspace/aws';

const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ec2-start'), instanceId: z.string().min(1) }),
  z.object({ action: z.literal('ec2-stop'), instanceId: z.string().min(1) }),
  z.object({
    action: z.literal('lambda-invoke'),
    functionName: z.string().min(1),
    payload: z.unknown().optional(),
  }),
]);

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [instances, functions] = await Promise.all([listInstances(), listFunctions()]);
    return NextResponse.json({
      success: true,
      instances: instances.map((i) => ({
        instanceId: i.InstanceId,
        state: i.State?.Name,
        type: i.InstanceType,
        publicIp: i.PublicIpAddress,
        privateIp: i.PrivateIpAddress,
        launchTime: i.LaunchTime,
      })),
      functions: functions.map((f) => ({
        functionName: f.FunctionName,
        runtime: f.Runtime,
        lastModified: f.LastModified,
        memorySize: f.MemorySize,
      })),
    });
  } catch (err) {
    logger.error('[admin/aws] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to reach AWS', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = commandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    switch (parsed.data.action) {
      case 'ec2-start': {
        await startInstance(parsed.data.instanceId);
        return NextResponse.json({ success: true, instanceId: parsed.data.instanceId, action: 'start' });
      }
      case 'ec2-stop': {
        await stopInstance(parsed.data.instanceId);
        return NextResponse.json({ success: true, instanceId: parsed.data.instanceId, action: 'stop' });
      }
      case 'lambda-invoke': {
        const result = await invokeLambda(parsed.data.functionName, parsed.data.payload);
        return NextResponse.json({ success: true, functionName: parsed.data.functionName, result });
      }
    }
  } catch (err) {
    logger.error('[admin/aws] POST failed:', err);
    return NextResponse.json(
      { error: 'AWS action failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
