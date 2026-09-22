import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

/**
 * Security Attestation Guard
 * Verifies request attestation headers or development/production tokens
 * without relying on deprecated Firebase AppCheck.
 *
 * Policy:
 *  - Dev/test environments (NODE_ENV !== 'production') bypass the check so
 *    local development and automated tests stay usable.
 *  - In production, APP_CHECK_SECRET MUST be set and the request MUST carry a
 *    token that matches it (constant-time compare). A missing secret fails
 *    CLOSED — never open.
 */
function constantTimeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to keep timing uniform, then report mismatch.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function verifyAppCheck(req: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (isDev) {
    return { isValid: true, token: { sub: 'system-attested' } };
  }

  const secret = process.env.APP_CHECK_SECRET;
  if (!secret) {
    // Fail closed: no secret configured in production → deny everything.
    return {
      isValid: false,
      errorResponse: NextResponse.json(
        { error: 'Server attestation is not configured (APP_CHECK_SECRET unset).' },
        { status: 503 }
      ),
    };
  }

  const rawHeader =
    req.headers.get('x-app-attestation') ||
    req.headers.get('x-firebase-appcheck') ||
    req.headers.get('x-api-key') ||
    req.headers.get('authorization') ||
    '';

  const token = rawHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      isValid: false,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Missing security attestation.' },
        { status: 401 }
      ),
    };
  }

  if (!constantTimeMatch(token, secret)) {
    return {
      isValid: false,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Invalid security attestation.' },
        { status: 401 }
      ),
    };
  }

  return { isValid: true, token: { sub: 'verified-request' } };
}
