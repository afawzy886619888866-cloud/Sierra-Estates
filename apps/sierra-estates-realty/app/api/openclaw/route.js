 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { getOpenClawGatewayConfig } from '@/lib/server/openclaw';
import { verifyAppCheck } from '@/lib/server/app-check';


























const isValidBody = (body) => {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const candidate = body ;

  return (
    !!candidate.stats &&
    typeof candidate.stats.listings === 'number' &&
    typeof candidate.stats.stakeholders === 'number' &&
    typeof candidate.stats.sales === 'string' &&
    typeof candidate.stats.priorityFocus === 'number' &&
    Array.isArray(candidate.activities) &&
    candidate.activities.every((item) => typeof item === 'string')
  );
};

const normalizeActivities = (activities) =>
  activities
    .map((activity) => activity.trim())
    .filter(Boolean)
    .slice(0, 8);

const coerceInsights = (content) => {
  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) {
      return [{ type: 'tip', text: content.trim() || 'No insight text was returned.', priority: 'low' }];
    }

    const parsed = JSON.parse(match[0]) ;
    return parsed
      .filter((item) => typeof _optionalChain([item, 'optionalAccess', _ => _.text]) === 'string' && typeof _optionalChain([item, 'optionalAccess', _2 => _2.type]) === 'string')
      .map((item) => ({
        type: item.type === 'opportunity' || item.type === 'warning' ? item.type : 'tip',
        text: item.text.trim(),
        priority: item.priority === 'high' ? 'high' : 'low',
        action: typeof item.action === 'string' && item.action.trim() ? item.action.trim() : undefined,
      }))
      .filter((item) => item.text.length > 0);
  } catch (e) {
    return [{ type: 'tip', text: 'AI analysis could not be formatted into structured insights.', priority: 'low' }];
  }
};

export async function POST(req) {
  // 1. Verify App Check Attestation
  const { isValid, errorResponse } = await verifyAppCheck(req);
  if (!isValid) {
    return errorResponse;
  }

  try {
    const gateway = getOpenClawGatewayConfig();

    if (!gateway.configured) {
      console.warn('[OpenClaw] Missing OPENCLAW_TOKEN; returning fallback response.');
      return NextResponse.json({ insights: null, error: 'OpenClaw token is not configured.' }, { status: 200 });
    }

    const body = await req.json() ;
    if (!isValidBody(body)) {
      return NextResponse.json({ insights: null, error: 'Invalid request payload.' }, { status: 400 });
    }

    const { stats } = body;
    const activities = normalizeActivities(body.activities);

    const systemPrompt = `You are a Senior Strategic Advisor for Sierra Estates Realty, an elite architectural portfolio management firm in Egypt.
Analyze the provided operational data and generate 3-4 sophisticated, high-impact business insights.
Enforce these terminology standards:
- Use "Investment Stakeholders" or "Strategic Partners" instead of leads/prospects.
- Use "Portfolio Assets" or "Signature Inventory" instead of listings/properties.
- Use "Capital Allocation" instead of budget.
- Use "Lifecycle Velocity" or "Conversion Momentum" instead of sales speed.
- Output ONLY a JSON array of objects with:
  - "type": "opportunity" | "warning" | "tip"
  - "text": One concise, executive-level sentence.
  - "priority": "high" | "low"
  - "action": (Optional) A 2-3 word sophisticated call to action (e.g. "Initiate Consultation", "Optimize Allocation")`;

    const userMessage = `Current platform data:
- Total Inventory Items: ${stats.listings}
- Active Investment Stakeholders: ${stats.stakeholders}
- Month Transaction Volume: ${stats.sales}
- Critical Priority Focus: ${stats.priorityFocus}
- Recent Operational Events: ${activities.length > 0 ? activities.join('; ') : 'No recent operations recorded'}
 
Generate 3–4 actionable insights based on this data. Highlight high-priority items with a Call to Action if appropriate.`;

    const response = await fetch(`${gateway.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gateway.token}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[OpenClaw] Gateway error:', response.status, errText);
      return NextResponse.json({ insights: null, error: `Gateway ${response.status}` }, { status: 200 });
    }

    const data = await response.json() ;
    const content = typeof _optionalChain([data, 'access', _3 => _3.choices, 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.message, 'optionalAccess', _6 => _6.content]) === 'string'
      ? data.choices[0].message.content
      : '';
    const insights = coerceInsights(content);

    return NextResponse.json({ insights });
  } catch (err) {
    const error = err ;
    console.warn('[OpenClaw] Fetch failed:', error.message);
    return NextResponse.json({ insights: null, error: error.message }, { status: 200 });
  }
}
