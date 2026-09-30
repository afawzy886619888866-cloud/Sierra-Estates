/**
 * Tests: Phase 13 — security sweep.
 *
 *   · B12 regression — the admin browser bundle must never carry the cron
 *     secret (no NEXT_PUBLIC_CRON_SECRET, no fallback literal 'sierra-cron');
 *     the PF sync goes through the admin-authenticated proxy route.
 *   · /api/admin/leads/sync-pf — 401 unauthenticated, in-process proxy with
 *     the server-side CRON_SECRET, 502 on upstream failure.
 *   · WhatsApp webhook HMAC — presented-but-unverifiable signature → 403,
 *     forged signature → 403, unsigned bridge traffic passes the shared gate.
 *   · Secrets scan — no credential-shaped literals in committed source
 *     (never print secrets; this pins it).
 *   · Service-role audit pin — public /api/inventory stays on the anon
 *     client under database RLS (Phase 4 least-privilege contract).
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ─── sync-pf route mocks ─────────────────────────────────────────────────────
const mockVerifyAdminRequest = jest.fn();
const mockCronSyncLeads = jest.fn();

jest.mock('@/lib/server/auth-guard', () => ({
    verifyAdminRequest: (...a: unknown[]) => mockVerifyAdminRequest(...a),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// The route imports the cron handler in-process — mock the module itself.
jest.mock('../app/api/cron/sync-leads/route', () => ({
    GET: (...a: unknown[]) => mockCronSyncLeads(...a),
}));

// ─── WhatsApp webhook mocks (hoisted, same set as webhook-fail-closed) ────────
const mockParseMessage = jest.fn().mockResolvedValue({ isListing: false });
const mockProcessIncomingMessage = jest.fn().mockResolvedValue({ id: 'listing-1' });
const mockProcessDirectMessage = jest.fn().mockResolvedValue('reply');
const mockRecordHeartbeat = jest.fn().mockResolvedValue(true);
const mockInsertRecord = jest.fn().mockResolvedValue({ id: 'doc-1' });
const mockListRecords = jest.fn().mockResolvedValue([]);

jest.mock('@sierra-estates/db', () => ({
    insertRecord: (...a: unknown[]) => mockInsertRecord(...a),
    listRecords: (...a: unknown[]) => mockListRecords(...a),
}));

jest.mock('@/lib/services/WhatsAppStatusService', () => ({
    WhatsAppStatusService: { recordHeartbeat: (...a: unknown[]) => mockRecordHeartbeat(...a) },
}));

jest.mock('@/lib/services/WhatsAppParserService', () => ({
    WhatsAppParserService: {
        parseMessage: (...a: unknown[]) => mockParseMessage(...a),
        processIncomingMessage: (...a: unknown[]) => mockProcessIncomingMessage(...a),
    },
}));

jest.mock('@/lib/services/WhatsAppConversationalService', () => ({
    WhatsAppConversationalService: {
        processDirectMessage: (...a: unknown[]) => mockProcessDirectMessage(...a),
    },
}));

jest.mock('@/lib/services/orchestrator', () => ({
    OrchestratorService: { runPipeline: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/services/sheets-sync', () => ({
    GoogleSheetsSync: { appendRow: jest.fn().mockResolvedValue(true) },
}));

jest.mock('@/lib/server/google-ai', () => ({
    GoogleAIService: { generateContent: jest.fn().mockResolvedValue('') },
}));

import { POST as syncPf } from '../app/api/admin/leads/sync-pf/route';

const APP_DIR = join(__dirname, '..');
const REPO_ROOT = join(APP_DIR, '..', '..');

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── B12: no cron secret in the browser bundle ───────────────────────────────
describe('B12 — cron secret never crosses to the browser', () => {
    it('AdminPortal no longer references NEXT_PUBLIC_CRON_SECRET or the sierra-cron fallback', () => {
        const source = readFileSync(join(APP_DIR, 'app', 'admin', 'AdminPortal.tsx'), 'utf8');
        expect(source).not.toContain('NEXT_PUBLIC_CRON_SECRET');
        expect(source).not.toContain('sierra-cron');
    });

    it('the PF sync button calls the admin-authenticated proxy, not the cron endpoint', () => {
        const source = readFileSync(join(APP_DIR, 'app', 'admin', 'AdminPortal.tsx'), 'utf8');
        expect(source).toContain("fetch('/api/admin/leads/sync-pf'");
        expect(source).not.toContain("fetch('/api/cron/sync-leads'");
    });

    it('no source file anywhere references NEXT_PUBLIC_CRON_SECRET (client-inlined secrets are banned)', () => {
        const offenders = walkFor(
            [join(APP_DIR, 'app'), join(APP_DIR, 'lib'), join(REPO_ROOT, 'packages')],
            (content, file) =>
                content.includes('NEXT_PUBLIC_CRON_SECRET') && !file.includes('__tests__')
                    ? file
                    : null,
        );
        expect(offenders).toEqual([]);
    });
});

// ─── /api/admin/leads/sync-pf ────────────────────────────────────────────────
describe('POST /api/admin/leads/sync-pf (admin proxy for the PF sync)', () => {
    function adminRequest(): NextRequest {
        return new NextRequest('https://sierra-estates.net/api/admin/leads/sync-pf', { method: 'POST' });
    }

    it('rejects unauthenticated callers with 401 before touching the cron route', async () => {
        mockVerifyAdminRequest.mockResolvedValue({ authenticated: false });
        const res = await syncPf(adminRequest());
        expect(res.status).toBe(401);
        expect(mockCronSyncLeads).not.toHaveBeenCalled();
    });

    it('invokes the cron handler in-process with the server-side CRON_SECRET header', async () => {
        process.env.CRON_SECRET = 'server-side-secret';
        try {
            mockVerifyAdminRequest.mockResolvedValue({ authenticated: true });
            mockCronSyncLeads.mockResolvedValue(
                NextResponse.json({ success: true, summary: { created: 3, updated: 1 } }),
            );

            const res = await syncPf(adminRequest());
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);

            const subReq = mockCronSyncLeads.mock.calls[0][0] as NextRequest;
            expect(subReq.nextUrl.pathname).toBe('/api/cron/sync-leads');
            expect(subReq.headers.get('authorization')).toBe('Bearer server-side-secret');
        } finally {
            delete process.env.CRON_SECRET;
        }
    });

    it('surfaces an upstream cron failure as 502 without leaking internals', async () => {
        mockVerifyAdminRequest.mockResolvedValue({ authenticated: true });
        mockCronSyncLeads.mockResolvedValue(
            NextResponse.json({ success: false, error: 'Property Finder API down' }, { status: 500 }),
        );

        const res = await syncPf(adminRequest());
        expect(res.status).toBe(502);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain('Property Finder API down');
    });
});

// ─── WhatsApp webhook HMAC (defense in depth) ────────────────────────────────
describe('WhatsApp webhook X-Hub-Signature-256 hardening', () => {
    const { createHmac } = require('crypto');

    beforeEach(() => {
        jest.resetModules();
        process.env.NODE_ENV = 'production';
        process.env.SBR_SECRET_KEY = 'bridge-secret';
    });

    afterEach(() => {
        process.env.NODE_ENV = 'test';
        delete process.env.SBR_SECRET_KEY;
        delete process.env.WHATSAPP_APP_SECRET;
    });

    async function postWebhook(headers: Record<string, string>): Promise<Response> {
        // Hoisted jest.mock factories above survive resetModules, so the
        // route's whole service graph loads mocked — same pattern the
        // webhook-fail-closed suite uses for this route.
        const { POST } = await import('../app/api/webhooks/whatsapp/route');
        const req = new NextRequest('https://sierra-estates.net/api/webhooks/whatsapp', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-sbr-secret-key': 'bridge-secret', ...headers },
            body: JSON.stringify({ from: 'external', text: 'hello' }),
        });
        return POST(req);
    }

    it('403s a FORGED signature when the app secret is configured', async () => {
        process.env.WHATSAPP_APP_SECRET = 'meta-app-secret';
        const res = await postWebhook({ 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) });
        expect(res.status).toBe(403);
    });

    it('403s a presented signature when no app secret is configured (unverifiable = rejected)', async () => {
        const body = JSON.stringify({ from: 'external', text: 'hello' });
        const digest = createHmac('sha256', 'anything').update(body).digest('hex');
        const res = await postWebhook({ 'x-hub-signature-256': `sha256=${digest}` });
        expect(res.status).toBe(403);
        expect((await res.json()).error).toContain('WHATSAPP_APP_SECRET');
    });

    it('accepts a CORRECTLY signed Meta payload', async () => {
        process.env.WHATSAPP_APP_SECRET = 'meta-app-secret';
        const body = JSON.stringify({ from: 'external', text: 'hello' });
        const digest = createHmac('sha256', 'meta-app-secret').update(body).digest('hex');
        const res = await postWebhook({ 'x-hub-signature-256': `sha256=${digest}` });
        expect(res.status).not.toBe(403);
    });

    it('still allows UNSIGNED traffic that passed the shared-secret gate (automation bridges)', async () => {
        const res = await postWebhook({});
        expect(res.status).not.toBe(403);
    });
});

// ─── Service-role least-privilege pin (Phase 4 Fix 1 regression) ─────────────
describe('service-role least privilege', () => {
    it('public /api/inventory reads through the anon client under database RLS', () => {
        const source = readFileSync(join(APP_DIR, 'app', 'api', 'inventory', 'route.ts'), 'utf8');
        expect(source).toContain('getSupabase');
        expect(source).not.toContain('getSupabaseAdmin');
    });
});

// ─── Public publish gate pins (activation plan Phase D) ─────────────────────
describe('public publish gate — every public listing surface filters publish_status', () => {
    it('/api/inventory gates the Supabase query AND drops unverified local-file tiers', () => {
        const source = readFileSync(join(APP_DIR, 'app', 'api', 'inventory', 'route.ts'), 'utf8');
        // The gate runs inside the query (RLS migration 020 may be unapplied).
        expect(source).toContain('.eq("publish_status", "PUBLISHABLE")');
        // Unverified local-file sources must never merge into the public GET.
        expect(source).not.toContain('readExcelListings');
        expect(source).not.toContain('fetchSheetUnits');
        expect(source).not.toContain('whatsapp-ingested-units.json');
        expect(source).not.toContain("from '@/lib/inventory/snapshot.json'");
        // §21: no invented location label (either fallback operator).
        expect(source).not.toContain('|| "New Cairo"');
        expect(source).not.toContain("|| 'New Cairo'");
        expect(source).not.toContain('?? "New Cairo"');
        expect(source).not.toContain("?? 'New Cairo'");
    });

    it('/api/feeds/property-finder exports only verified (PUBLISHABLE) units', () => {
        const source = readFileSync(
            join(APP_DIR, 'app', 'api', 'feeds', 'property-finder', 'route.ts'),
            'utf8'
        );
        expect(source).toContain("publishStatus: 'PUBLISHABLE'");
        // The unverified snapshot fallback was removed (Phase D/E doctrine).
        expect(source).not.toContain("snapshot.json");
    });

    it('/api/matches filters status AND publish_status inside the query', () => {
        const source = readFileSync(join(APP_DIR, 'app', 'api', 'matches', 'route.ts'), 'utf8');
        expect(source).toContain(`{ column: "publish_status", op: "eq", value: "PUBLISHABLE" }`);
    });
});

// ─── §21 no-fabrication fallback guard (Rule B regression) ──────────────────
describe('§21 no-fabrication — runtime sources carry no invented defaults', () => {
    // Wave-3: patterns now also catch the nullish-coalescing (`??`) variant —
    // `locationArea: region ?? 'New Cairo'` fabricates exactly like `||` did.
    const FABRICATION_PATTERNS: Array<[string, RegExp]> = [
        ['default compound', /(?:\|\||\?\?)\s*['"]New Cairo['"]/],
        ['default property type', /(?:\|\||\?\?)\s*['"]Apartment['"]/],
        ['default compound (Sierra)', /(?:\|\||\?\?)\s*['"]Sierra['"]/],
        ['default finishing', /(?:\|\||\?\?)\s*['"](?:semi_finished|Super Lux|Semi-Finished|Unfurnished)['"]/],
        ['default zone', /(?:\|\||\?\?)\s*['"]5th Settlement['"]/],
        ['default client name', /(?:\|\||\?\?)\s*['"]VIP Client['"]/],
        ['default source label', /(?:\|\||\?\?)\s*['"]Master Sheet['"]/],
        ['fabricated inventory count', /(?:\|\||\?\?)\s*306\b/],
        ['fabricated valuation score', /valuationScore\s*(?:\|\||\?\?)\s*(?:70|75|80)\b/],
        ['fabricated urgency score', /urgencyScore\s*(?:\|\||\?\?)\s*(?:70|75)\b/],
        ['fabricated USD price', /usd\s*(?:\|\||\?\?)\s*1500\b/],
        ['fabricated bedroom count', /\b(?:beds|bedrooms)\s*(?:\|\||\?\?)\s*3\b/],
        ['fabricated bathroom count', /\b(?:baths|bathrooms)\s*(?:\|\||\?\?)\s*2\b/],
        // Wave-4: legal documents and operational parameters.
        ['default compound (Mivida)', /(?:\|\||\?\?)\s*['"]Mivida['"]/],
        ['default unit identity', /(?:\|\||\?\?)\s*['"](?:Villa 142-B|Standalone Villa)['"]/],
        ['default delivery date', /(?:\|\||\?\?)\s*['"]December 2026['"]/],
        ['default invented party name', /(?:\|\||\?\?)\s*['"](?:Dr\. Karim Mansour|Emaar Misr Developments)['"]/],
        ['default local scan path', /(?:\|\||\?\?)\s*['"]I:\\\\supabase\\\\Sheets['"]/],
        ['fabricated docusign domain', /docusign\.sierra-estates\.com/],
        ['fabricated envelope id', /envelopeId:\s*`env_\$\{Date\.now\(\)\}`/],
    ];
    const RUNTIME_ROOTS = [
        join(REPO_ROOT, 'packages'),
        join(APP_DIR, 'lib'),
        join(APP_DIR, 'app'),
        join(REPO_ROOT, 'apps', 'agents'),
        // Wave-3: repo ops scripts write to the database too (sync / merge /
        // embed / export) — they must not fabricate either.
        join(REPO_ROOT, 'scripts'),
    ];

    it('finds no invented fallback defaults in runtime sources', () => {
        const offenders: string[] = [];
        offenders.push(
            ...walkFor(RUNTIME_ROOTS, (content, file) => {
                if (file.includes('__tests__') || file.includes('.test.') || file.includes('__mocks__')) {
                    return null;
                }
                for (const [label, pattern] of FABRICATION_PATTERNS) {
                    if (pattern.test(content)) return `${file}: ${label}`;
                }
                return null;
            }),
        );
        expect(offenders).toEqual([]);
    });
});

// ─── Secrets scan ────────────────────────────────────────────────────────────
describe('secrets scan — no credential-shaped literals in committed source', () => {
    const CREDENTIAL_PATTERNS: Array<[string, RegExp]> = [
        ['OpenAI-style sk- key', /sk-[A-Za-z0-9]{20,}/],
        ['GitHub PAT', /ghp_[A-Za-z0-9]{30,}/],
        ['AWS access key', /AKIA[0-9A-Z]{16}/],
        ['Google API key', /AIza[0-9A-Za-z_-]{30,}/],
        ['Slack bot token', /xoxb-[0-9]{10,}-[0-9]{10,}-[0-9A-Za-z]{20,}/],
        ['Supabase service-role JWT shape', /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
    ];

    it('finds no hardcoded credentials (test fixtures and .env files excluded)', () => {
        const offenders: string[] = [];
        for (const root of [join(APP_DIR, 'app'), join(APP_DIR, 'lib'), join(REPO_ROOT, 'packages')]) {
            // walkFor takes an ARRAY of roots — a bare string would be
            // iterated character-by-character ('/' exists, so it would
            // recursively walk the whole filesystem).
            offenders.push(
                ...walkFor([root], (content, file) => {
                    for (const [label, pattern] of CREDENTIAL_PATTERNS) {
                        const match = content.match(pattern);
                        if (match && !file.includes('__tests__') && !file.includes('__mocks__') && !file.includes('.test.')) {
                            return `${file}: ${label}`;
                        }
                    }
                    return null;
                }),
            );
        }
        expect(offenders).toEqual([]);
    });
});

// ─── helpers ─────────────────────────────────────────────────────────────────
function walkFor(
    roots: string[],
    predicate: (content: string, file: string) => string | null,
): string[] {
    const hits: string[] = [];
    for (const root of roots) {
        if (!existsSync(root)) continue;
        walk(root);
    }
    return hits;

    function walk(dir: string): void {
        let entries: string[];
        try {
            entries = readdirSync(dir);
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.git')) continue;
            const full = join(dir, entry);
            let st;
            try {
                st = statSync(full);
            } catch {
                continue;
            }
            if (st.isDirectory()) {
                walk(full);
            } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
                try {
                    const content = readFileSync(full, 'utf8');
                    const hit = predicate(content, full);
                    if (hit) hits.push(hit);
                } catch {
                    /* unreadable — skip */
                }
            }
        }
    }
}
