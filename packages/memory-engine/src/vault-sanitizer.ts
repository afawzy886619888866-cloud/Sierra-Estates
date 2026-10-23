/**
 * SIERRA ESTATES — ECC MEMORY VAULT SANITIZER & CLASSIFIER
 * 
 * Ported from Everything Claude Code (ECC) Memory Vault Specification.
 * Ensures:
 * 1. Zero credential leakage: Scans and blocks secrets (Stripe, API keys, JWT, SSH/RSA, GitHub/Google tokens).
 * 2. Standardized memory categorization:
 *    - 'decision': Architectural or strategic business commitments
 *    - 'lesson': Post-mortem observations or edge-case learnings
 *    - 'handoff': Cross-agent or cross-session state transfers
 *    - 'runbook': Reusable procedural workflows
 *    - 'fact': Verified ground-truth property, legal, or market facts
 *    - 'context': Ambient task context
 *    - 'preference': Stakeholder or developer taste preferences
 * 3. Enforces safety: prevents control characters or bidirectional injection.
 */

export type MemoryKind =
  | 'context'
  | 'decision'
  | 'fact'
  | 'handoff'
  | 'lesson'
  | 'note'
  | 'preference'
  | 'runbook';

export type MemoryScope = 'project' | 'team' | 'user';

export interface SecretPattern {
  label: string;
  pattern: RegExp;
}

export const SECRET_PATTERNS: ReadonlyArray<SecretPattern> = [
  { label: 'provider API key', pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/i },
  { label: 'Stripe key', pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/ },
  { label: 'npm token', pattern: /\bnpm_[A-Za-z0-9]{20,}\b/ },
  { label: 'Hugging Face token', pattern: /\bhf_[A-Za-z0-9]{20,}\b/ },
  { label: 'GitHub token', pattern: /\bgh[pors]_[A-Za-z0-9]{16,}\b/ },
  { label: 'GitHub token (PAT)', pattern: /\bgithub_pat_[A-Za-z0-9_]{16,}\b/ },
  { label: 'Google API key', pattern: /\bAIza[A-Za-z0-9_-]{16,}\b/ },
  { label: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { label: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { label: 'private key', pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { label: 'Supabase secret key', pattern: /\beyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}\b/ },
];

/**
 * Checks for control or bidirectional formatting characters that could spoof content.
 */
export function hasUnsafeControlCharacters(value: string, allowBodyWhitespace: boolean = true): boolean {
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;

    const isAllowedWhitespace =
      allowBodyWhitespace && (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d);

    const isControl = (codePoint <= 0x1f && !isAllowedWhitespace) || (codePoint >= 0x7f && codePoint <= 0x9f);
    const isBidirectionalFormatting =
      (codePoint >= 0x202a && codePoint <= 0x202e) || (codePoint >= 0x2066 && codePoint <= 0x2069);

    if (isControl || isBidirectionalFormatting) {
      return true;
    }
  }
  return false;
}

/**
 * Scans content for secrets and returns labels of any detected credentials.
 */
export function findPotentialSecrets(content: string): string[] {
  const matches: string[] = [];
  for (const item of SECRET_PATTERNS) {
    if (item.pattern.test(content)) {
      matches.push(item.label);
    }
  }
  return matches;
}

/**
 * Sanitizes and validates a memory document payload before persisting.
 * Throws an explicit error if credentials or injection vectors are detected.
 */
export function validateMemorySafety(
  title: string,
  body: string,
  kind: MemoryKind = 'context'
): { isValid: boolean; sanitizedTitle: string; sanitizedBody: string; detectedSecrets: string[] } {
  const detectedSecrets = findPotentialSecrets(`${title}\n${body}`);
  if (detectedSecrets.length > 0) {
    throw new Error(
      `[ECC Safety Violation] Credential shape detected in memory content (${detectedSecrets.join(
        ', '
      )}). Storing credentials in memory is prohibited.`
    );
  }

  if (hasUnsafeControlCharacters(title, false)) {
    throw new Error('[ECC Safety Violation] Memory title contains unsafe control or bidirectional characters.');
  }

  if (hasUnsafeControlCharacters(body, true)) {
    throw new Error('[ECC Safety Violation] Memory body contains unsafe bidirectional characters.');
  }

  return {
    isValid: true,
    sanitizedTitle: title.trim(),
    sanitizedBody: body.trim(),
    detectedSecrets: [],
  };
}
