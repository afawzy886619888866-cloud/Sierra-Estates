import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFExportService } from '@/lib/services/pdf-export-service';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sendProposalSchema = z.object({
  proposalId: z.string().min(3),
  investorName: z.string().min(2),
  investorPhone: z.string().min(10, 'Valid phone number is required'),
  investorEmail: z.string().email().optional(),
  propertyTitle: z.string().min(3),
  propertyTitleAr: z.string().optional(),
  propertyLocation: z.string().min(3),
  propertyLocationAr: z.string().optional(),
  investmentAmount: z.number().positive(),
  expectedROI: z.number(),
  projectedCashFlow: z.number(),
  riskLevel: z.enum(['low', 'moderate', 'high']).default('low'),
  recommendation: z.string().min(10),
  recommendationAr: z.string().optional(),
  language: z.enum(['en', 'ar', 'bilingual']).default('ar'),
  closerName: z.string().optional(),
  leadId: z.string().optional(),
});

/**
 * POST /api/proposals/send-whatsapp
 * Allows closer to dispatch a tailored investment proposal PDF via WhatsApp.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const parse = sendProposalSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parse.error.flatten() },
        { status: 400 },
      );
    }

    const data = parse.data;
    const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net';

    const result = await PDFExportService.sendProposalViaWhatsApp({
      data,
      closerName: data.closerName,
      leadId: data.leadId,
      siteUrl: clientUrl,
    });

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      pdfUrl: result.pdfUrl,
      proposalId: data.proposalId,
      message: 'Proposal PDF enqueued successfully to WhatsApp queue.',
    });
  } catch (err: any) {
    const status = err?.message?.includes('Rate limit') ? 429 : 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to send proposal via WhatsApp' },
      { status },
    );
  }
}
