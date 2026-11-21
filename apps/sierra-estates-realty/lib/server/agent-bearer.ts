import 'server-only';

/**
 * Bearer-secret verification for the agent OpenAI-compatible surface.
 * OpenClaw (and any OpenAI-protocol client) sends its provider apiKey as
 * `Authorization: Bearer <secret>` — the shared SBR_SECRET_KEY, never a real
 * LLM key. Constant-time compare, same posture as webhook-auth.safeEqual.
 */

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

export function verifyBearerSecret(req: Request, name: string): NextResponse | null {
    const secret = process.env.SBR_SECRET_KEY;
    if (!secret) {
        return NextResponse.json(
            { error: { message: `${name}: SBR_SECRET_KEY is not configured on the worker.`, type: 'configuration_error' } },
            { status: 503 }
        );
    }
    const header = req.headers.get('authorization') || '';
    const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!provided || !safeEqual(provided, secret)) {
        return NextResponse.json(
            { error: { message: 'Unauthorized — missing or invalid bearer secret.', type: 'authentication_error' } },
            { status: 401 }
        );
    }
    return null;
}
