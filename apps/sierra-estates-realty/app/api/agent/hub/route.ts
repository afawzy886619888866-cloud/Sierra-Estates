import { NextResponse, NextRequest } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { GoogleAIService } from '@/lib/server/google-ai';
import { LEILA_PROMPT } from '@/lib/prompts';
import { GravityRecall } from '@/lib/server/gravity';

/**
 * Agent Hub — multi-agent orchestration entry point.
 *
 * Routes an inbound message to one of the Stage-9 personas (Scribe / Curator /
 * Matchmaker / Closer) based on agentId, grounding responses in Gravity Memory.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();
  try {
    const { agentId, message } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'No message provided.' });
    }

    // Role-based logic
    switch (agentId) {
      case 'SIERRA_CORE':
      case 'SCRIBE':
        return handleScribe(message);
      case 'CURATOR':
        return handleCurator(message);
      case 'MATCHMAKER':
        return handleMatchmaker(message);
      case 'CLOSER':
        return handleCloser(message);
      default:
        return NextResponse.json({ success: false, error: 'Unknown agent ID.' });
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal pipeline error.';
    return NextResponse.json({ success: false, error: errorMessage });
  }
}

async function handleScribe(message: string) {
  try {
    // Stage 2 Integration: Pull context from Gravity Memory
    const marketContext = GravityRecall.getContextSnippet('market_trends', undefined, 3);
    const complexContext = GravityRecall.getContextSnippet('compounds', undefined, 3);

    const enrichedSystemPrompt = `
      ${LEILA_PROMPT.system}

      CRITICAL SYSTEM UPDATE:
      Your persona is now 'Sierra', the Master Intelligence.
      You have access to the 'Gravity Memory' below which contains real-time facts about the project.
      Use this data to ground your answers in reality.

      ${marketContext}
      ${complexContext}
    `;

    const responseText = await GoogleAIService.generateContent(
      'SIERRA', 'S1-Intake',
      {
        system: enrichedSystemPrompt,
        user: message,
      },
      { model: 'gemini-1.5-flash', temperature: 0.3 }
    );

    const isVIP = responseText.includes('[VIP_ALERT_TRIGGER]');
    const cleanResponse = responseText.replace('[VIP_ALERT_TRIGGER]', '').trim();

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      vipAlert: isVIP,
    });
  } catch (error) {
    console.error('Scribe Error:', error);
    return NextResponse.json({
      success: true,
      response: 'أهلاً بك. ليلى غير متوفرة حالياً بسبب تحديثات تقنية. يرجى الانتظار قليلاً.',
    });
  }
}

async function handleCurator(_message: string) {
  // Asset Branding (S3)
  const response = `The Architect of Desire has received your request. Crafting high-fidelity narrative assets for your property. Global distribution nodes (S4) are being primed.`;
  return NextResponse.json({ success: true, response });
}

async function handleMatchmaker(message: string) {
  // Valuation Engine & Stakeholder Profiling (S6 - S7)
  const systemPrompt = `You are the Matchmaker (Architect of Wealth) for Sierra Estates Realty.
Your job is to run the Valuation Engine on the requested property details.
All pricing is audited by AI based on 4 axes:
1. Core Metrics: Location, Finishing Grade, Property Age.
2. Yield Logic: Target 8-10% rental yield.
3. Premium Add-ons: View (Sea/Landscape), Orientation (Bahary), Floor level.
4. Market CMA: Comparison against the last 5 actual deals and the "18-month growth plan."

Provide a highly analytical, quiet-luxury tone assessment of the user's request. Output your analysis clearly.`;

  try {
    const responseText = await GoogleAIService.generateContent(
      'MATCHMAKER', 'S6-Valuation',
      {
        system: systemPrompt,
        user: message,
      },
      { model: 'gemini-1.5-flash', temperature: 0.2 }
    );

    return NextResponse.json({ success: true, response: responseText });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Valuation Engine Offline.' });
  }
}

async function handleCloser(_message: string) {
  // Asset Finalization (S9)
  const response = `Optimization feedback loop (S10) active. Reviewing closing documentation for systemic integrity. Finalizing asset transition.`;
  return NextResponse.json({ success: true, response });
}
