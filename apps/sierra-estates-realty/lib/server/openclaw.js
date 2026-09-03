 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';







const normalizeBaseUrl = (value) => _optionalChain([value, 'optionalAccess', _ => _.trim, 'call', _2 => _2(), 'access', _3 => _3.replace, 'call', _4 => _4(/\/+$/, '')]) || '';

export function getOpenClawGatewayConfig() {
  const baseUrl = normalizeBaseUrl(process.env.OPENCLAW_BASE_URL);
  const token = _optionalChain([process, 'access', _5 => _5.env, 'access', _6 => _6.OPENCLAW_TOKEN, 'optionalAccess', _7 => _7.trim, 'call', _8 => _8()]) || '';

  return {
    baseUrl,
    token,
    configured: Boolean(baseUrl && token),
  };
}
