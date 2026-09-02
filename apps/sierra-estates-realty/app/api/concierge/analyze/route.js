 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { getOpenClawGatewayConfig } from '@/lib/server/openclaw';

export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    const gateway = getOpenClawGatewayConfig();
    const systemPrompt = `Analyze this real estate listing. Extract as JSON:
    { "compound": "string", "beds": number, "price": number, "currency": "EGP"|"USD", "furnishing": "F"|"U"|"S"|"K", "type": "string", "building": "string", "unitNumber": "string", "features": ["string"] }`;

    const res = await fetch(`${gateway.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${gateway.token}` 
      },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
        temperature: 0
      })
    });

    const data = await res.json();
    const content = _optionalChain([data, 'access', _ => _.choices, 'optionalAccess', _2 => _2[0], 'optionalAccess', _3 => _3.message, 'optionalAccess', _4 => _4.content]);
    if (!content) throw new Error("AI extraction failed.");

    const json = JSON.parse(_optionalChain([content, 'access', _5 => _5.match, 'call', _6 => _6(/\{[\s\S]*\}/), 'optionalAccess', _7 => _7[0]]) || '{}');
    return NextResponse.json(json);
  } catch (err) {
    console.error("AI Analysis API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
