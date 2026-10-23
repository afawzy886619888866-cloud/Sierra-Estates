import { NextRequest, NextResponse } from 'next/server';
import { generateOptionsPackage } from '@/lib/services/sales-engine';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const proposalId = await generateOptionsPackage(leadId);

    return NextResponse.json({ 
      success: true, 
      proposalId,
      message: 'Strategic options package generated successfully.'
    });

  } catch (error: any) {
    console.error('[PROPOSAL_API_ERROR]', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
