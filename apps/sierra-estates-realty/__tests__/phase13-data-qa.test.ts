/**
 * Tests: Phase 13 — data QA + bot QA matrix.
 *
 * DATA QA — runs the Phase 1 pipeline's own invariants as a test against the
 * REAL master inventory CSV (data/MASTER_INVENTORY_V1.csv). No fixtures: the
 * audit contract (12,088 sourced rows → 8,486 unique + 3,602 duplicates, 0
 * PUBLISHABLE) is pinned here so any regeneration that changes the shape must
 * be a conscious, reviewed act — not silent drift.
 *
 * BOT QA MATRIX — the Gemini-based extraction cannot run E2E without an API
 * key (blocked, documented). What IS load-bearing and therefore pinned here:
 * the extraction PROMPT must instruct the hard/soft split, the Phase 5
 * gap-fill fields, and the NO-INVENTION rule; and the lead mapping must keep
 * unknown values null instead of inventing defaults (AR/EN/mixed/vague/
 * contradictory inputs all flow through this same contract).
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const APP_DIR = join(__dirname, '..');
const REPO_ROOT = join(APP_DIR, '..', '..');

const CSV_CANDIDATES = [
    join(REPO_ROOT, 'data', 'MASTER_INVENTORY_V1.csv'),
    join(APP_DIR, 'data', 'MASTER_INVENTORY_V1.csv'),
];

/* ── Shared minimal CSV parser (same as the personas suite) ────────────────── */
function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
            } else cur += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out;
}

interface InventoryRow {
    unitId: string;
    duplicateOf: string;
    publishStatus: string;
    priceValidity: string;
}

function loadInventory(): InventoryRow[] {
    const csvPath = CSV_CANDIDATES.find((p) => existsSync(p));
    if (!csvPath) {
        throw new Error(
            'MASTER_INVENTORY_V1.csv not found — the Phase 13 data QA suite must run against the real inventory, never fixtures. Run scripts/data-audit/build_master_inventory.py first.',
        );
    }
    const lines = readFileSync(csvPath, 'utf8').split('\n').filter((l) => l.trim());
    const header = parseCsvLine(lines[0]);
    const idx = (name: string) => header.indexOf(name);
    const iUnit = idx('unit_id');
    const iDupe = idx('duplicate_of');
    const iStatus = idx('publish_status');
    const iPriceValidity = idx('price_validity');

    const rows: InventoryRow[] = [];
    for (const line of lines.slice(1)) {
        const c = parseCsvLine(line);
        rows.push({
            unitId: c[iUnit],
            duplicateOf: c[iDupe],
            publishStatus: c[iStatus],
            priceValidity: c[iPriceValidity],
        });
    }
    return rows;
}

// ─── Data QA ─────────────────────────────────────────────────────────────────
describe('Phase 13 — master inventory data QA (Phase 1 pipeline invariants)', () => {
    const rows = loadInventory();
    const unitIds = new Set(rows.map((r) => r.unitId));
    const duplicates = rows.filter((r) => r.publishStatus === 'DUPLICATE');
    const uniques = rows.filter((r) => r.publishStatus !== 'DUPLICATE');

    it('keeps the audit contract shape: 12,088 rows = 8,486 unique + 3,602 duplicates', () => {
        expect(rows.length).toBe(12088);
        expect(uniques.length).toBe(8486);
        expect(duplicates.length).toBe(3602);
        expect(uniques.length + duplicates.length).toBe(rows.length);
    });

    it('has a globally unique unit_id for every row (no id collisions)', () => {
        expect(unitIds.size).toBe(rows.length);
    });

    it('never leaves a row referencing itself as its duplicate (0 self-referencing duplicate_of)', () => {
        const selfRefs = rows.filter((r) => r.duplicateOf && r.duplicateOf === r.unitId);
        expect(selfRefs).toEqual([]);
    });

    it('resolves every duplicate_of chain to a real unit (0 dangling references)', () => {
        const dangling = rows.filter((r) => r.duplicateOf && !unitIds.has(r.duplicateOf));
        expect(dangling).toEqual([]);
    });

    it('keeps PUBLISHABLE honestly at zero — publication requires verified data, by rule', () => {
        // The Phase 1 audit's central finding: 0 of 8,486 units are publishable
        // (91.5% never source-verified, only ~36% plausibly-valid prices). If
        // this ever flips, it must be a deliberate, verified data change that
        // updates this contract — never silent pipeline drift.
        const publishable = rows.filter((r) => r.publishStatus === 'PUBLISHABLE');
        expect(publishable).toEqual([]);
    });

    it('records a price-validity share consistent with the audit (~36% valid)', () => {
        // price_validity is the pipeline's own classification of the price
        // (valid / missing / suspicious_low / invalid_for_deal_type /
        // usd_unconfirmed). The audit's "only ~36% plausibly valid" finding
        // maps to the `valid` bucket — pinned as a band so regenerations that
        // materially change price quality fail here visibly.
        const validPrices = uniques.filter((r) => r.priceValidity === 'valid');
        const share = validPrices.length / uniques.length;
        expect(share).toBeGreaterThan(0.3);
        expect(share).toBeLessThan(0.45);
    });
});

// ─── Bot QA matrix (prompt + mapping contract; E2E blocked on Gemini key) ─────
describe('Phase 13 — bot extraction QA matrix (contract level)', () => {
    const source = readFileSync(join(APP_DIR, 'lib', 'services', 'WhatsAppConversationalService.ts'), 'utf8');

    it('the extraction prompt demands the hard/soft constraint split', () => {
        expect(source).toContain('HARD constraints');
        expect(source).toContain('SOFT preferences');
    });

    it('the extraction prompt carries the no-invention rule (AR/EN/mixed/vague/contradictory all rely on it)', () => {
        expect(source).toContain('Never invent values');
    });

    it('the extraction prompt includes every Phase 5 gap-fill field', () => {
        for (const field of ['minBedrooms', 'furnishing', 'moveInDate', 'nationality', 'specialRequirements']) {
            expect(source).toContain(`"${field}"`);
        }
    });

    it('the lead mapping preserves unknowns as null instead of inventing defaults', () => {
        // `?? null` (not `|| <default>`) is the no-invention mapping contract.
        for (const field of ['minBedrooms', 'furnishing', 'moveInDate', 'nationality', 'specialRequirements']) {
            expect(source).toContain(`intel.${field} ?? null`);
        }
    });
});
