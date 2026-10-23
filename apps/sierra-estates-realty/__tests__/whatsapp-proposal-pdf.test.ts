jest.mock('../lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: jest.fn().mockResolvedValue('mock-wa-job-999'),
}));

import { PDFExportService, type ProposalPDFData } from '../lib/services/pdf-export-service';

describe('Phase 6: Proposal PDFs on WhatsApp with Arabic RTL (04 §B2)', () => {
  const sampleData: ProposalPDFData = {
    proposalId: 'PROP-2026-TEST',
    investorName: 'Eng. Sherif Mansour',
    investorPhone: '+201099887766',
    propertyTitle: 'Mivida Luxury 3-Bedroom Villa',
    propertyTitleAr: 'فيلا فاخرة 3 غرف في ميفيدا',
    propertyLocation: 'Golden Square, New Cairo',
    propertyLocationAr: 'المربع الذهبي، القاهرة الجديدة',
    investmentAmount: 18500000,
    expectedROI: 28.5,
    projectedCashFlow: 1200000,
    riskLevel: 'low',
    recommendation: 'Exceptional capital preservation asset with above-market rental yield.',
    recommendationAr: 'أصل استثماري استثنائي يحقق عائداً إيجارياً مرتفعاً ونمواً رأسمالياً واعداً.',
    language: 'ar',
  };

  beforeEach(() => {
    PDFExportService.resetRateLimit();
  });

  it('generates a conforming %PDF-1.4 binary buffer with embedded metadata', async () => {
    const buffer = await PDFExportService.generateProposalPDF(sampleData);

    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const pdfString = buffer.toString('utf-8');
    // PDF Magic number verification
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfString).toContain('SIERRA ESTATES');
    expect(pdfString).toContain('PROP-2026-TEST');
    expect(pdfString).toContain('%%EOF');

    // Retrieval from store
    const stored = PDFExportService.getStoredPDF(sampleData.proposalId);
    expect(stored).toEqual(buffer);
  });

  it('renders rich HTML with Arabic RTL font embedding and styling', () => {
    const html = PDFExportService.buildProposalHTML(sampleData);

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('Cairo');
    expect(html).toContain('Amiri');
    expect(html).toContain('فيلا فاخرة 3 غرف في ميفيدا');
    expect(html).toContain('18,500,000');
    expect(html).toContain('+28.5%');
  });

  it('enforces strict rate-limiting per recipient phone number (max 5 per window)', () => {
    const testPhone = '+201011112222';

    // 1 to 5 must succeed
    for (let i = 0; i < 5; i++) {
      const res = PDFExportService.checkRateLimit(testPhone);
      expect(res.allowed).toBe(true);
    }

    // 6th must be rejected
    const blocked = PDFExportService.checkRateLimit(testPhone);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // Reset restores
    PDFExportService.resetRateLimit(testPhone);
    const restored = PDFExportService.checkRateLimit(testPhone);
    expect(restored.allowed).toBe(true);
  });

  it('dispatches proposal to WhatsApp queue with client-recommendation purpose', async () => {
    const result = await PDFExportService.sendProposalViaWhatsApp({
      data: sampleData,
      closerName: 'Karim',
      siteUrl: 'https://sierra-estates.net',
    });

    expect(result.success).toBe(true);
    expect(result.jobId).toBeDefined();
    expect(result.pdfUrl).toBe('https://sierra-estates.net/api/proposals/PROP-2026-TEST/pdf');
    expect(result.messageBody).toContain('أهلاً بك أستاذ Eng. Sherif Mansour');
    expect(result.messageBody).toContain('https://sierra-estates.net/api/proposals/PROP-2026-TEST/pdf');
    expect(result.messageBody).toContain('+28.5%');
  });
});
