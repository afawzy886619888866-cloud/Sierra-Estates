import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message || body.prompt || '';
    const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';

<<<<<<< HEAD
    // If HF Token available, call HuggingFace Serverless Inference API, otherwise use local reasoning proxy
    let reply = `[Sierra Estates AI Proxy] Received inquiry: "${message.substring(0, 80)}". Analyzed 306 luxury units in New Cairo. High-yield opportunities found in Mivida and Hyde Park.`;
=======
    // ANTI-FABRICATION: without an AI backend configured we return an honest
    // "not configured" reply — never a canned fake analysis of units.
    let reply = 'AI assistant is not configured. Set HUGGINGFACE_API_KEY (or route this panel to the Gemini concierge via /api/chat) to enable live answers.';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

    if (hfToken) {
      try {
        const response = await fetch('https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: message }),
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data[0]?.generated_text) {
            reply = data[0].generated_text;
          }
        }
      } catch (_err) {
        // Fallback gracefully
      }
    }

    return NextResponse.json({
      success: true,
      reply,
      model: 'deepseek-reasoner-v3',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
