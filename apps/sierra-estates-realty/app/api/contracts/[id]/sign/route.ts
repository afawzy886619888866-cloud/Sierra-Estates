import { NextRequest, NextResponse } from 'next/server';
import { renderBilingualContractHtml, DigitalContractData } from '@/lib/services/digital-contracts';
import { getRecord } from '@sierra-estates/db';
import { sharedMemory } from '@sierra-estates/memory-engine';
import { logger } from '@/lib/logger';

// §21 no-fabrication: this route used to invent an entire contract for ANY
// id — a "Madinaty B14" unit, buyer/seller names with real-looking 14-digit
// Egyptian national IDs, phones, an agreed price and even a signature hash —
// and the POST claimed "digital signature verified and permanently logged
// to audit ledger" while verifying nothing and persisting nothing. Both
// halves are now honest: GET renders only a contract that actually exists
// (DB lookup, 404 otherwise), and POST records a real signature event to
// the shared audit memory before answering.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let contract: DigitalContractData | null = null;
  try {
    contract = (await getRecord<DigitalContractData>('contracts', id)) ?? null;
  } catch (err) {
    logger.warn(`[contracts/sign] Contract lookup failed for ${id}:`, err);
    return NextResponse.json(
      { success: false, error: 'Contract lookup failed' },
      { status: 502 }
    );
  }

  if (!contract) {
    return NextResponse.json(
      { success: false, error: `Contract ${id} not found` },
      { status: 404 }
    );
  }

  const html = renderBilingualContractHtml(contract);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const signerName =
    typeof body.signerName === 'string' ? body.signerName.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';

  const missing: string[] = [];
  if (!signerName) missing.push('signerName');
  if (!role) missing.push('role');
  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Signature requires the real signer identity — refusing to sign on behalf of an unnamed "Client"',
        missing,
      },
      { status: 400 }
    );
  }

  const signedAt = new Date().toISOString();
  const auditKey = `contract_sign:${id}:${signedAt}`;

  // Persist the signature event BEFORE claiming success — the audit trail
  // must actually exist for the response to say it does.
  try {
    await sharedMemory.write(
      auditKey,
      {
        contractId: id,
        signerName,
        role,
        signedAt,
      },
      { author: 'sierra-ops', tags: ['contract_signature', id, role] }
    );
  } catch (err) {
    logger.error(`[contracts/sign] Failed to persist signature event for ${id}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: 'Signature event could not be recorded to the audit trail',
      },
      { status: 500 }
    );
  }

  logger.info(`[contracts/sign] Contract ${id} signed by ${signerName} (${role}) at ${signedAt}`);

  return NextResponse.json({
    success: true,
    contractId: id,
    status: 'signed',
    signedBy: signerName,
    role,
    signedAt,
    auditKey,
    message: 'Signature recorded to the shared audit trail.',
  });
}
