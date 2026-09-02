import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Shared webhook authentication.
 *
 * Mirrors the semantics already proven in `lib/server/cron-auth.ts`: a webhook
 * whose shared secret is not configured is treated as MISCONFIGURED, not as
 * "open to everyone". Previously each webhook guarded itself with
 * `if (SECRET) { ...check... }`, which silently disabled authentication
 * whenever the secret was absent — the exact case where an operator has not
 * finished setting the deployment up.
 *
 * Returns a response to send back when the request must be rejected, or `null`
 * when the caller is authorised and the route should proceed.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

function misconfigured(name) {
  if (IS_PROD) {
    return NextResponse.json(
      { error: `Webhook is not configured (${name} is unset)` },
      { status: 503 },
    );
  }
  // Development only: allow local testing without a secret.
  return null;
}

/** Constant-time compare that never throws on length mismatch. */
function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Verify a webhook that authenticates with a plain shared secret sent in a header.
 */
export function verifySharedSecret(
  req,
  opts,
) {
  const { header, secret, name } = opts;
  if (!secret) return misconfigured(name);

  const provided = req.headers.get(header);
  if (!provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Verify a webhook that signs its raw body with an HMAC-SHA256 hex digest.
 */
export function verifyHmacSignature(
  rawBody,
  signature,
  opts,
) {
  const { secret, name } = opts;
  if (!secret) return misconfigured(name);

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!safeEqual(signature, expected)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  return null;
}
