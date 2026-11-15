import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { listRegisteredPrompts, validatePromptOutput, type PromptId } from '@/lib/prompts';
import { validateEnv } from '@/lib/core';
import {
  getAgentManifest,
  getRecentAgentBusEvents,
  runPropertyParserDryRun,
  runUnitCoderDryRun,
  runInventoryMatcherDryRun,
  runLeadQualifierDryRun,
  runWhatsAppDispatcherDryRun,
  runCareerEvaluatorDryRun,
} from '@/lib/agents-bus';
import { getAutomationStatusMatrix } from '@/lib/automations-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/prompts
 * Returns the active Prompt Registry, Agent Manifest, Environment Validation summary,
 * and live Automation Activation Matrix.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  const prompts = listRegisteredPrompts();
  const agents = getAgentManifest();
  const envStatus = validateEnv({ strict: false });
  const automations = getAutomationStatusMatrix();
  const recentEvents = getRecentAgentBusEvents();

  return NextResponse.json({
    ok: true,
    prompts,
    agents,
    envStatus,
    automations,
    recentEvents,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * POST /api/admin/prompts
 * Executes non-destructive dry-run validation & invocation across any registered agent or prompt.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = (await request.json()) as {
      action?: string;
      agent?: string;
      promptId?: PromptId;
      payload?: Record<string, unknown>;
    };

    if (body.action === 'validate_prompt_output' && body.promptId) {
      const validation = validatePromptOutput(body.promptId, body.payload);
      return NextResponse.json(validation);
    }

    const p = body.payload || {};
    const requireString = (val: unknown, field: string): string => {
      if (typeof val !== 'string' || val.trim().length === 0) {
        throw new Error(`Missing required field "${field}" for agent dry-run.`);
      }
      return val.trim();
    };

    switch (body.agent) {
      case 'PropertyParserAgent': {
        const result = runPropertyParserDryRun({
          rawText: requireString(p.rawText, 'rawText'),
          source: (p.source as 'owner' | 'broker' | 'whatsapp' | undefined) || 'whatsapp',
          defaultPhone: typeof p.defaultPhone === 'string' ? p.defaultPhone : undefined,
        });
        return NextResponse.json({ ok: true, agent: body.agent, result });
      }
      case 'UnitCoderAgent': {
        const result = runUnitCoderDryRun({
          compound: requireString(p.compound, 'compound'),
          mode: p.mode === 'rent' ? 'rent' : 'sale',
          areaSqm: typeof p.areaSqm === 'number' ? p.areaSqm : Number(p.areaSqm || 0),
          phone: typeof p.phone === 'string' ? p.phone : undefined,
          unitNumber: typeof p.unitNumber === 'string' ? p.unitNumber : undefined,
        });
        return NextResponse.json({ ok: true, agent: body.agent, result });
      }
      case 'InventoryMatcherAgent': {
        const result = runInventoryMatcherDryRun({
          requestId: requireString(p.requestId, 'requestId'),
          zone: requireString(p.zone, 'zone'),
          mode: p.mode === 'rent' ? 'rent' : 'sale',
          budgetEgp: Number(p.budgetEgp || 0),
          candidates: Array.isArray(p.candidates)
            ? (p.candidates as Array<{ unitCode: string; compound: string; mode: 'sale' | 'rent'; priceEgp: number }>)
            : [],
        });
        return NextResponse.json({ ok: true, agent: body.agent, result });
      }
      case 'LeadQualifierAgent': {
        const result = runLeadQualifierDryRun({
          leadId: requireString(p.leadId, 'leadId'),
          name: requireString(p.name, 'name'),
          zone: requireString(p.zone, 'zone'),
          budget: requireString(p.budget, 'budget'),
        });
        return NextResponse.json({ ok: true, agent: body.agent, result });
      }
      case 'WhatsAppDispatcherAgent': {
        const result = runWhatsAppDispatcherDryRun({
          unitCode: requireString(p.unitCode, 'unitCode'),
          compound: requireString(p.compound, 'compound'),
          unitType: requireString(p.unitType, 'unitType'),
          mode: p.mode === 'rent' ? 'rent' : 'sale',
          areaSqm: typeof p.areaSqm === 'number' ? p.areaSqm : Number(p.areaSqm || 0),
          bedrooms: typeof p.bedrooms === 'number' ? p.bedrooms : Number(p.bedrooms || 0),
          priceEgp: typeof p.priceEgp === 'number' ? p.priceEgp : Number(p.priceEgp || 0),
          contactPhone: requireString(p.contactPhone, 'contactPhone'),
          channelSource: p.channelSource === 'owner' ? 'owner' : 'broker',
        });
        return NextResponse.json({ ok: true, agent: body.agent, result });
      }
      case 'CareerEvaluatorAgent': {
        const result = runCareerEvaluatorDryRun({
          applicationId: requireString(p.applicationId, 'applicationId'),
          role: requireString(p.role, 'role'),
          experienceYears: Number(p.experienceYears || 0),
          hasVehicle: Boolean(p.hasVehicle),
          achievements: requireString(p.achievements, 'achievements'),
        });
        return NextResponse.json({ ok: true, agent: body.agent, result });
      }
      default:
        return NextResponse.json(
          { ok: false, error: 'Unsupported agent or promptId in POST /api/admin/prompts' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Prompt agent dry-run failed' },
      { status: 500 }
    );
  }
}
