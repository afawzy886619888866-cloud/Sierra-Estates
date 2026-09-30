import { NextRequest, NextResponse } from 'next/server';
import {
  ContractGeneratorEngine,
  ContractParty,
  ContractPropertySpecs,
} from '@sierra-estates/agents-core';
import { getRecord } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

// §21 no-fabrication: a Sales & Purchase Agreement is a binding legal
// record. The old route silently substituted a complete invented deal —
// seller "Emaar Misr Developments" (fake national ID, fake phone), buyer
// "Dr. Karim Mansour", Mivida "Villa 142-B", 390 sqm BUA, 38M EGP total,
// 3.8M down payment, 1,068,750 quarterly, 8-year tenure, December 2026
// delivery — whenever the request body was missing or partial. Missing
// terms now fail loudly with a 400 listing every missing field; parties,
// unit identity and financial terms must all arrive explicitly.
//
// GET (AdminPortal "📄 Contract" button wiring): loads the REAL deal by id
// (deals → leads buyer + listings unit), assembles SPA terms strictly from
// recorded fields, and renders bilingual HTML. Missing terms render an
// honest readiness page instead of a fabricated contract. `format=json`
// returns the POST-shaped envelope for machine callers. The only computed
// figure is the quarterly installment — arithmetic over recorded inputs
// (total, down payment, tenure), which is calculation, not fabrication.

const REQUIRED_PARTY_FIELDS = ['name', 'nationalIdOrPassport', 'phone'] as const;

function partyMissingFields(party: unknown, prefix: string): string[] {
  if (!party || typeof party !== 'object') {
    return REQUIRED_PARTY_FIELDS.map((f) => `${prefix}.${f}`);
  }
  const record = party as Record<string, unknown>;
  return REQUIRED_PARTY_FIELDS.filter(
    (f) => typeof record[f] !== 'string' || (record[f] as string).trim() === ''
  ).map((f) => `${prefix}.${f}`);
}

const positiveNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const nonEmptyStr = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

/* ───────────────────── GET: contract from the real deal record ────────── */

interface DealRow {
  id: string;
  lead_id?: string | null;
  listing_id?: string | null;
  deal_value?: number | string | null;
  metadata?: Record<string, unknown> | null;
}

interface LeadRow {
  full_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ListingRow {
  compound?: string | null;
  ref_id?: string | null;
  code?: string | null;
  property_type?: string | null;
  area_sqm?: number | string | null;
  price?: number | string | null;
  down_payment?: number | string | null;
  installment_years?: number | string | null;
  delivery_year?: number | string | null;
  metadata?: Record<string, unknown> | null;
}

function htmlEscape(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderContractHtml(spa: {
  contractReference: string;
  createdAt: string;
  seller: ContractParty;
  buyer: ContractParty;
  property: ContractPropertySpecs;
  articlesAr: { articleNumber: number; title: string; content: string }[];
  articlesEn: { articleNumber: number; title: string; content: string }[];
  escrowMilestones: { stage: string; requiredVerification: string; releasePercent: number; amountEGP: number }[];
}): string {
  const p = spa.property;
  const fmt = (n: number) => n.toLocaleString('en-EG');
  const articlesHtml = (spa.articlesEn || [])
    .map(
      (a) =>
        `<section class="article"><h3>Article ${a.articleNumber} — ${htmlEscape(a.title)}</h3><p>${htmlEscape(a.content)}</p></section>`
    )
    .join('');
  const articlesArHtml = (spa.articlesAr || [])
    .map(
      (a) =>
        `<section class="article" dir="rtl" lang="ar"><h3>المادة ${a.articleNumber} — ${htmlEscape(a.title)}</h3><p>${htmlEscape(a.content)}</p></section>`
    )
    .join('');
  const milestonesHtml = (spa.escrowMilestones || [])
    .map(
      (m) =>
        `<tr><td>${htmlEscape(m.stage)}</td><td>${htmlEscape(m.requiredVerification)}</td><td>${m.releasePercent}%</td><td>${fmt(m.amountEGP)} EGP</td></tr>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${htmlEscape(spa.contractReference)} — Sierra Estates SPA</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;margin:0;background:#f7f5f1;color:#1a1a1a}
  .sheet{max-width:860px;margin:24px auto;background:#fff;padding:48px 56px;box-shadow:0 2px 24px rgba(0,0,0,.08)}
  h1{font-size:22px;letter-spacing:.08em;text-transform:uppercase;border-bottom:2px solid #b08d57;padding-bottom:12px}
  .ref{font-family:monospace;color:#8a6d3b;font-size:12px}
  table{width:100%;border-collapse:collapse;margin:14px 0 22px}
  th,td{border:1px solid #d8d2c4;padding:8px 10px;font-size:13px;text-align:left;vertical-align:top}
  th{background:#f3efe6;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
  .article{margin:18px 0}
  .article h3{font-size:13px;margin:0 0 4px;color:#5a4a2f}
  .article p{font-size:13.5px;line-height:1.65;margin:0}
  .note{font-size:11px;color:#777;border-top:1px solid #e5dfd2;margin-top:26px;padding-top:10px}
</style></head><body><div class="sheet">
  <h1>Sales &amp; Purchase Agreement</h1>
  <div class="ref">Ref ${htmlEscape(spa.contractReference)} · generated ${htmlEscape(spa.createdAt)}</div>
  <table>
    <tr><th>Seller (First Party)</th><td>${htmlEscape(spa.seller.name)}<br/>${htmlEscape(spa.seller.nationalIdOrPassport)}<br/>${htmlEscape(spa.seller.phone)}</td>
        <th>Buyer (Second Party)</th><td>${htmlEscape(spa.buyer.name)}<br/>${htmlEscape(spa.buyer.nationalIdOrPassport)}<br/>${htmlEscape(spa.buyer.phone)}</td></tr>
    <tr><th>Unit</th><td colspan="3">${htmlEscape(p.unitType)} ${htmlEscape(p.unitNumber)} — ${htmlEscape(p.compoundName)}</td></tr>
    <tr><th>BUA</th><td>${fmt(p.buaSqm)} sqm</td><th>Total price</th><td>${fmt(p.totalPriceEGP)} EGP</td></tr>
    <tr><th>Down payment</th><td>${fmt(p.downPaymentEGP)} EGP</td><th>Quarterly installment</th><td>${fmt(p.quarterlyInstallmentEGP)} EGP × ${p.installmentTenureYears} yrs</td></tr>
    <tr><th>Delivery</th><td colspan="3">${htmlEscape(p.deliveryDateStr)}</td></tr>
  </table>
  ${articlesHtml}
  <h3 style="font-size:13px;color:#5a4a2f">Escrow Milestones</h3>
  <table><tr><th>Stage</th><th>Verification</th><th>Release</th><th>Amount</th></tr>${milestonesHtml}</table>
  ${articlesArHtml}
  <div class="note">This draft is generated from recorded deal terms. It is not a substitute for legal review by Egyptian counsel.</div>
</div></body></html>`;
}

function renderReadinessHtml(dealId: string, known: Array<[string, string]>, missing: string[]): string {
  const knownRows = known
    .map(([k, v]) => `<tr><th>${htmlEscape(k)}</th><td>${htmlEscape(v)}</td></tr>`)
    .join('');
  const missingItems = missing.map((m) => `<li>${htmlEscape(m)}</li>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Deal ${htmlEscape(dealId)} — contract not ready</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#f7f5f1;color:#1a1a1a}
  .sheet{max-width:680px;margin:24px auto;background:#fff;padding:40px 44px;box-shadow:0 2px 24px rgba(0,0,0,.08)}
  h1{font-size:18px;border-bottom:2px solid #c0392b;padding-bottom:10px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #d8d2c4;padding:7px 9px;font-size:13px;text-align:left}
  th{background:#f3efe6;width:220px}
  ul{font-family:monospace;font-size:13px;line-height:1.7}
  .warn{color:#c0392b;font-size:12px;margin-top:14px}
</style></head><body><div class="sheet">
  <h1>Contract not generatable yet</h1>
  <p style="font-size:13.5px">Deal <b>${htmlEscape(dealId)}</b> exists, but its record does not carry every term a
  Sales &amp; Purchase Agreement legally requires. Sierra never invents missing contract terms — supply them
  explicitly via <code>POST /api/closer/contract</code> (or complete the deal record) and re-open this page.</p>
  ${known.length ? `<h3 style="font-size:13px">Terms on file</h3><table>${knownRows}</table>` : ''}
  <h3 style="font-size:13px">Missing terms</h3><ul>${missingItems}</ul>
  <div class="warn">No contract document was produced for this deal.</div>
</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const url = new URL(req.url);
  const dealId = url.searchParams.get('id');
  const wantsJson = url.searchParams.get('format') === 'json';

  if (!dealId) {
    return NextResponse.json(
      { success: false, error: 'id query parameter is required', missing: ['id'] },
      { status: 400 }
    );
  }

  let deal: DealRow | null;
  let lead: LeadRow | null = null;
  let listing: ListingRow | null = null;
  try {
    deal = await getRecord<DealRow>('deals', dealId);
    if (!deal) {
      return NextResponse.json(
        { success: false, error: `Deal ${dealId} not found` },
        { status: 404 }
      );
    }
    if (deal.lead_id) lead = await getRecord<LeadRow>('leads', deal.lead_id);
    if (deal.listing_id) listing = await getRecord<ListingRow>('listings', deal.listing_id);
  } catch (err) {
    logger.error(`[closer/contract] Deal lookup failed for ${dealId}:`, err);
    return NextResponse.json(
      { success: false, error: 'Deal lookup failed' },
      { status: 502 }
    );
  }

  const dealMeta = (deal.metadata ?? {}) as Record<string, unknown>;
  const leadMeta = (lead?.metadata ?? {}) as Record<string, unknown>;
  const listingMeta = (listing?.metadata ?? {}) as Record<string, unknown>;

  // Seller identity is only what a record actually carries.
  const sellerMeta = (dealMeta.seller ?? listingMeta.owner ?? null) as Record<string, unknown> | null;
  const seller: ContractParty | null = sellerMeta
    ? {
        name: String(sellerMeta.name ?? ''),
        nationalIdOrPassport: String(sellerMeta.nationalIdOrPassport ?? ''),
        nationality: String(sellerMeta.nationality ?? ''),
        address: String(sellerMeta.address ?? ''),
        phone: String(sellerMeta.phone ?? ''),
      }
    : null;

  const buyer: ContractParty | null = lead
    ? {
        name: lead.full_name ?? '',
        nationalIdOrPassport: String(leadMeta.nationalId ?? leadMeta.buyerNationalId ?? ''),
        nationality: String(leadMeta.nationality ?? ''),
        address: String(leadMeta.address ?? ''),
        phone: (nonEmptyStr(lead.whatsapp) ?? nonEmptyStr(lead.phone) ?? '') as string,
      }
    : null;

  const compoundName = nonEmptyStr(listing?.compound);
  const unitNumber =
    nonEmptyStr(listingMeta.unitNumber) ?? nonEmptyStr(listing?.ref_id) ?? nonEmptyStr(listing?.code);
  const unitType = nonEmptyStr(listing?.property_type);
  const buaSqm = positiveNum(listing?.area_sqm);
  const totalPriceEGP = positiveNum(deal.deal_value) ?? positiveNum(listing?.price);
  const downPaymentEGP =
    positiveNum(dealMeta.downPaymentEGP) ?? positiveNum(listing?.down_payment);
  const installmentTenureYears =
    positiveNum(dealMeta.installmentTenureYears) ?? positiveNum(listing?.installment_years);
  // Quarterly installment: taken as recorded, or DERIVED by arithmetic from
  // recorded inputs only (total − down payment over 4·years). This is
  // computation over real values — never an invented constant.
  const quarterlyInstallmentEGP =
    positiveNum(dealMeta.quarterlyInstallmentEGP) ??
    (totalPriceEGP && downPaymentEGP && installmentTenureYears && totalPriceEGP > downPaymentEGP
      ? Math.round((totalPriceEGP - downPaymentEGP) / (4 * installmentTenureYears))
      : null);
  const deliveryDateStr =
    nonEmptyStr(dealMeta.deliveryDateStr) ??
    (positiveNum(listing?.delivery_year) ? String(listing?.delivery_year) : null);

  const missing: string[] = [
    ...partyMissingFields(seller, 'seller'),
    ...partyMissingFields(buyer, 'buyer'),
  ];
  if (!compoundName) missing.push('compoundName');
  if (!unitNumber) missing.push('unitNumber');
  if (!unitType) missing.push('unitType');
  if (buaSqm === null) missing.push('buaSqm');
  if (totalPriceEGP === null) missing.push('totalPriceEGP');
  if (downPaymentEGP === null) missing.push('downPaymentEGP');
  if (quarterlyInstallmentEGP === null) missing.push('quarterlyInstallmentEGP');
  if (installmentTenureYears === null) missing.push('installmentTenureYears');
  if (!deliveryDateStr) missing.push('deliveryDateStr');

  if (missing.length > 0) {
    if (wantsJson) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Deal record lacks required SPA terms — refusing to fabricate them. Complete the deal record or POST explicit terms.',
          missing,
        },
        { status: 400 }
      );
    }
    const known: Array<[string, string]> = [];
    if (compoundName) known.push(['Compound', compoundName]);
    if (unitNumber) known.push(['Unit', unitNumber]);
    if (unitType) known.push(['Type', unitType]);
    if (buaSqm !== null) known.push(['BUA', `${buaSqm} sqm`]);
    if (totalPriceEGP !== null) known.push(['Total price', `${totalPriceEGP.toLocaleString('en-EG')} EGP`]);
    if (downPaymentEGP !== null) known.push(['Down payment', `${downPaymentEGP.toLocaleString('en-EG')} EGP`]);
    if (installmentTenureYears !== null) known.push(['Tenure', `${installmentTenureYears} years`]);
    if (buyer?.name) known.push(['Buyer', buyer.name]);
    if (seller?.name) known.push(['Seller', seller.name]);
    return new NextResponse(renderReadinessHtml(dealId, known, missing), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const property: ContractPropertySpecs = {
    compoundName: compoundName as string,
    unitNumber: unitNumber as string,
    unitType: unitType as string,
    buaSqm: buaSqm as number,
    totalPriceEGP: totalPriceEGP as number,
    downPaymentEGP: downPaymentEGP as number,
    quarterlyInstallmentEGP: quarterlyInstallmentEGP as number,
    installmentTenureYears: installmentTenureYears as number,
    deliveryDateStr: deliveryDateStr as string,
  };

  const spa = ContractGeneratorEngine.generateSPA(
    seller as ContractParty,
    buyer as ContractParty,
    property
  );

  if (wantsJson) {
    return NextResponse.json({
      success: true,
      spa,
      timestamp: new Date().toISOString(),
    });
  }
  return new NextResponse(renderContractHtml(spa), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/* ───────────────────── POST: explicit terms only ───────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const missing: string[] = [
      ...partyMissingFields(body.seller, 'seller'),
      ...partyMissingFields(body.buyer, 'buyer'),
    ];
    if (!body.compoundName || String(body.compoundName).trim() === '') missing.push('compoundName');
    if (!body.unitNumber || String(body.unitNumber).trim() === '') missing.push('unitNumber');
    if (!body.unitType || String(body.unitType).trim() === '') missing.push('unitType');
    if (positiveNum(body.buaSqm) === null) missing.push('buaSqm');
    if (positiveNum(body.totalPriceEGP) === null) missing.push('totalPriceEGP');
    if (positiveNum(body.downPaymentEGP) === null) missing.push('downPaymentEGP');
    if (positiveNum(body.quarterlyInstallmentEGP) === null) missing.push('quarterlyInstallmentEGP');
    if (positiveNum(body.installmentTenureYears) === null) missing.push('installmentTenureYears');
    if (!body.deliveryDateStr || String(body.deliveryDateStr).trim() === '') missing.push('deliveryDateStr');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Contract terms must be provided explicitly — refusing to fabricate parties, unit or pricing defaults',
          missing,
        },
        { status: 400 }
      );
    }

    const seller: ContractParty = {
      name: body.seller.name,
      nationalIdOrPassport: body.seller.nationalIdOrPassport,
      nationality: body.seller.nationality || '',
      address: body.seller.address || '',
      phone: body.seller.phone,
    };

    const buyer: ContractParty = {
      name: body.buyer.name,
      nationalIdOrPassport: body.buyer.nationalIdOrPassport,
      nationality: body.buyer.nationality || '',
      address: body.buyer.address || '',
      phone: body.buyer.phone,
    };

    const property: ContractPropertySpecs = {
      compoundName: body.compoundName,
      unitNumber: body.unitNumber,
      unitType: body.unitType,
      buaSqm: positiveNum(body.buaSqm) as number,
      totalPriceEGP: positiveNum(body.totalPriceEGP) as number,
      downPaymentEGP: positiveNum(body.downPaymentEGP) as number,
      quarterlyInstallmentEGP: positiveNum(body.quarterlyInstallmentEGP) as number,
      installmentTenureYears: positiveNum(body.installmentTenureYears) as number,
      deliveryDateStr: body.deliveryDateStr,
    };

    const spa = ContractGeneratorEngine.generateSPA(seller, buyer, property);

    return NextResponse.json({
      success: true,
      spa,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
