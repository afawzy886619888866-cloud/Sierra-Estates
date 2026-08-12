import { NextResponse } from 'next/server';
import { getOpenClawGatewayConfig } from '@/lib/server/openclaw';

export async function POST(req: Request) {
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
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI extraction failed.");

    const json = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
    return NextResponse.json(json);
  } catch (err: any) {
    console.error("AI Analysis API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
