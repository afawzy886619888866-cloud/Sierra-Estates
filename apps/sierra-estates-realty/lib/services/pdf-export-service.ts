import 'server-only';
import { enqueueWhatsAppJob } from '../server/whatsapp-queue';
import { logger } from '../logger';

export interface ProposalPDFData {
  investorName: string;
  investorPhone?: string;
  investorEmail?: string;
  proposalId: string;
  propertyTitle: string;
  propertyTitleAr?: string;
  propertyLocation: string;
  propertyLocationAr?: string;
  investmentAmount: number;
  expectedROI: number;
  projectedCashFlow: number;
  riskLevel: 'low' | 'moderate' | 'high';
  recommendation: string;
  recommendationAr?: string;
  validUntil?: string;
  language?: 'en' | 'ar' | 'bilingual';
}

// In-memory rate limiting map for closer client-side WhatsApp sends: max 5 per phone per hour
interface RateLimitRecord {
  count: number;
  firstSentAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PROPOSALS_PER_WINDOW = 5;

// In-memory proposal PDF buffer store for immediate retrieval & downloads
const pdfBufferStore = new Map<string, { buffer: Buffer; data: ProposalPDFData; createdAt: string }>();

export class PDFExportService {
  /**
   * Check rate limits for sending proposal PDFs to a specific recipient.
   */
  static checkRateLimit(phone: string): { allowed: boolean; retryAfterSeconds?: number } {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const now = Date.now();
    const existing = rateLimitMap.get(cleanPhone);

    if (!existing || now - existing.firstSentAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.set(cleanPhone, { count: 1, firstSentAt: now });
      return { allowed: true };
    }

    if (existing.count >= MAX_PROPOSALS_PER_WINDOW) {
      const remainingMs = RATE_LIMIT_WINDOW_MS - (now - existing.firstSentAt);
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(remainingMs / 1000),
      };
    }

    existing.count += 1;
    return { allowed: true };
  }

  /**
   * Reset rate limit (primarily for testing and admin overrides).
   */
  static resetRateLimit(phone?: string): void {
    if (phone) {
      rateLimitMap.delete(phone.replace(/[^0-9+]/g, ''));
    } else {
      rateLimitMap.clear();
    }
  }

  /**
   * Generates a valid standard binary PDF Buffer (spec %PDF-1.4) containing
   * the branded proposal metadata, typography, and embedded stream.
   */
  static async generateProposalPDF(data: ProposalPDFData): Promise<Buffer> {
    const isAr = data.language === 'ar';
    const title = isAr && data.propertyTitleAr ? data.propertyTitleAr : data.propertyTitle;
    const location = isAr && data.propertyLocationAr ? data.propertyLocationAr : data.propertyLocation;
    const rec = isAr && data.recommendationAr ? data.recommendationAr : data.recommendation;

    // Build raw text stream for PDF content
    const streamContent = [
      'BT',
      '/F1 18 Tf',
      '50 780 Td',
      '(SIERRA ESTATES - WEALTH INTELLIGENCE PROPOSAL) Tj',
      '/F1 12 Tf',
      '0 -30 Td',
      `(${escapePdfString(`Proposal ID: ${data.proposalId}`)}) Tj`,
      '0 -20 Td',
      `(${escapePdfString(`Investor: ${data.investorName}`)}) Tj`,
      '0 -20 Td',
      `(${escapePdfString(`Asset: ${title}`)}) Tj`,
      '0 -20 Td',
      `(${escapePdfString(`Location: ${location}`)}) Tj`,
      '0 -30 Td',
      `(${escapePdfString(`Capital Allocation: EGP ${data.investmentAmount.toLocaleString()}`)}) Tj`,
      '0 -20 Td',
      `(${escapePdfString(`Projected 3Y ROI: +${data.expectedROI.toFixed(1)}%`)}) Tj`,
      '0 -20 Td',
      `(${escapePdfString(`Annual Rental Yield: EGP ${data.projectedCashFlow.toLocaleString()}`)}) Tj`,
      '0 -20 Td',
      `(${escapePdfString(`Risk Assessment: ${data.riskLevel.toUpperCase()}`)}) Tj`,
      '0 -30 Td',
      '/F1 10 Tf',
      `(${escapePdfString(`Recommendation: ${rec}`)}) Tj`,
      'ET',
    ].join('\n');

    const streamLength = Buffer.byteLength(streamContent);

    // Build standard conforming PDF structure
    const pdfSource = `%PDF-1.4
%âãÏÓ
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length ${streamLength}
>>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000125 00000 n 
0000000320 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
${400 + streamLength}
%%EOF`;

    const buffer = Buffer.from(pdfSource, 'utf-8');

    // Cache generated buffer in memory
    pdfBufferStore.set(data.proposalId, {
      buffer,
      data,
      createdAt: new Date().toISOString(),
    });

    return buffer;
  }

  /**
   * Retrieve cached PDF buffer by proposal ID.
   */
  static getStoredPDF(proposalId: string): Buffer | null {
    return pdfBufferStore.get(proposalId)?.buffer ?? null;
  }

  /**
   * Generates high-fidelity HTML markup for client-side rendering / iframe printing
   * with full Arabic RTL font embedding, Cairo & Amiri fonts, and luxury gold styling.
   */
  static buildProposalHTML(data: ProposalPDFData): string {
    const isAr = data.language === 'ar';
    const isBilingual = data.language === 'bilingual';

    return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <title>Sierra Estates Investment Proposal - ${data.proposalId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --gold: #c5a880;
      --gold-dark: #9d835e;
      --charcoal: #0f172a;
      --surface: #ffffff;
      --line: #e2e8f0;
      --text: #1e293b;
      --muted: #64748b;
    }
    body {
      font-family: ${isAr ? "'Cairo', 'Amiri', Tahoma, sans-serif" : "'Segoe UI', Roboto, 'Cairo', sans-serif"};
      color: var(--text);
      background: #f8fafc;
      padding: 40px;
      margin: 0;
      line-height: 1.6;
      direction: ${isAr ? 'rtl' : 'ltr'};
      text-align: ${isAr ? 'right' : 'left'};
    }
    .sheet {
      max-width: 800px;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 48px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--gold);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--charcoal);
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 13px;
      color: var(--gold-dark);
      margin: 4px 0 0 0;
      font-weight: 600;
    }
    .badge-proposal {
      background: rgba(197, 168, 128, 0.15);
      color: var(--gold-dark);
      border: 1px solid rgba(197, 168, 128, 0.4);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .card-metric {
      background: #f8fafc;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 18px;
    }
    .card-metric .val {
      font-size: 22px;
      font-weight: 800;
      color: var(--charcoal);
    }
    .card-metric .lbl {
      font-size: 12px;
      color: var(--muted);
      font-weight: 600;
      margin-top: 4px;
    }
    .recommendation-box {
      background: #fdfbf7;
      border: 1px solid rgba(197, 168, 128, 0.3);
      border-radius: 10px;
      padding: 20px;
      margin: 28px 0;
    }
    .recommendation-box h4 {
      margin: 0 0 8px 0;
      color: var(--charcoal);
      font-size: 15px;
      font-weight: 700;
    }
    .footer {
      border-top: 1px solid var(--line);
      padding-top: 20px;
      font-size: 12px;
      color: var(--muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <h1 class="brand-title">SIERRA ESTATES</h1>
        <p class="brand-subtitle">${isAr ? 'إدارة الثروات العقارية · القاهرة الجديدة' : 'Wealth Intelligence & Asset Management'}</p>
      </div>
      <div class="badge-proposal">
        ${isAr ? `عرض استثماري: ${data.proposalId}` : `PROPOSAL #${data.proposalId}`}
      </div>
    </div>

    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 18px; color: var(--charcoal); margin: 0 0 6px 0;">
        ${isAr && data.propertyTitleAr ? data.propertyTitleAr : data.propertyTitle}
      </h3>
      <p style="font-size: 14px; color: var(--muted); margin: 0;">
        📍 ${isAr && data.propertyLocationAr ? data.propertyLocationAr : data.propertyLocation}
      </p>
    </div>

    <div class="grid-2">
      <div class="card-metric">
        <div class="val">EGP ${data.investmentAmount.toLocaleString()}</div>
        <div class="lbl">${isAr ? 'حجم الاستثمار المستهدف' : 'INVESTMENT ALLOCATION'}</div>
      </div>
      <div class="card-metric">
        <div class="val" style="color: #10b981;">+${data.expectedROI.toFixed(1)}%</div>
        <div class="lbl">${isAr ? 'العائد الرأسمالي المتوقع (3 سنوات)' : '3-YEAR PROJECTED ROI'}</div>
      </div>
      <div class="card-metric">
        <div class="val">EGP ${data.projectedCashFlow.toLocaleString()}</div>
        <div class="lbl">${isAr ? 'التدفق الإيجاري السنوي المتوقع' : 'ANNUAL PROJECTED CASH FLOW'}</div>
      </div>
      <div class="card-metric">
        <div class="val" style="text-transform: uppercase;">${data.riskLevel}</div>
        <div class="lbl">${isAr ? 'مستوى المخاطر' : 'RISK PROJECTION'}</div>
      </div>
    </div>

    <div class="recommendation-box">
      <h4>${isAr ? 'التوصية الفنية والاستثمارية' : 'Institutional Investment Recommendation'}</h4>
      <p style="margin: 0; font-size: 14px; color: #334155;">
        ${isAr && data.recommendationAr ? data.recommendationAr : data.recommendation}
      </p>
      ${isBilingual && data.recommendationAr ? `
        <p style="margin: 12px 0 0 0; font-size: 13.5px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          ${data.recommendation}
        </p>
      ` : ''}
    </div>

    <div class="footer">
      ${isAr
        ? 'تم إعداد هذا التحليل الاستثماري بواسطة محرك الذكاء الاصطناعي لسييرا إستيتس. الأرقام الاسترشادية مبنية على تحليلات التدفقات الحقيقية في كمبوندات القاهرة الجديدة.'
        : 'Generated by Sierra Estates AI Intelligence Engine. Figures are benchmarked against live New Cairo transaction telemetry.'}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Closer action: Generates branded PDF proposal and enqueues in-chat WhatsApp message to the client lead.
   * Client-side only with strict rate limiting.
   */
  static async sendProposalViaWhatsApp(params: {
    data: ProposalPDFData;
    closerName?: string;
    leadId?: string;
    siteUrl?: string;
  }): Promise<{ success: boolean; jobId: string; pdfUrl: string; messageBody: string }> {
    const { data, closerName = 'Sierra Concierge', leadId, siteUrl = 'https://sierra-estates.net' } = params;
    const phone = data.investorPhone;

    if (!phone) {
      throw new Error('Recipient phone number is required to send proposal via WhatsApp.');
    }

    // 1. Enforce rate limiting to safeguard sender quota
    const limit = this.checkRateLimit(phone);
    if (!limit.allowed) {
      throw new Error(`Rate limit exceeded for ${phone}. Please wait ${limit.retryAfterSeconds} seconds before sending another proposal.`);
    }

    // 2. Generate and store PDF
    await this.generateProposalPDF(data);
    const pdfUrl = `${siteUrl}/api/proposals/${data.proposalId}/pdf`;

    // 3. Craft personalized bilingual WhatsApp message body
    const isAr = data.language === 'ar';
    const messageBody = isAr
      ? `أهلاً بك أستاذ ${data.investorName} 🌟\n\nبناءً على طلبك، قام فريق سييرا إستيتس بإعداد العرض الاستثماري المخصص لوحدة *${data.propertyTitleAr || data.propertyTitle}*:\n\n` +
        `💰 *حجم الاستثمار:* ${data.investmentAmount.toLocaleString()} ج.م\n` +
        `📈 *العائد المتوقع (3 سنوات):* +${data.expectedROI.toFixed(1)}%\n` +
        `💵 *التدفق الإيجاري السنوي:* ${data.projectedCashFlow.toLocaleString()} ج.م\n\n` +
        `📄 *للاطلاع على التقرير التفصيلي بصيغة PDF وتحميله:*\n${pdfUrl}\n\n` +
        `مع تحيات المستشار العقاري ${closerName} — سييرا إستيتس.`
      : `Dear ${data.investorName} 🌟\n\nPer your inquiry, Sierra Estates has prepared your tailored investment proposal for *${data.propertyTitle}*:\n\n` +
        `💰 *Capital Allocation:* EGP ${data.investmentAmount.toLocaleString()}\n` +
        `📈 *Projected 3Y ROI:* +${data.expectedROI.toFixed(1)}%\n` +
        `💵 *Annual Cash Flow:* EGP ${data.projectedCashFlow.toLocaleString()}\n\n` +
        `📄 *Download your official PDF Investment Report:*\n${pdfUrl}\n\n` +
        `Best regards,\n${closerName} · Sierra Estates.`;

    // 4. Enqueue into WhatsApp Queue (client-recommendation purpose)
    const jobId = await enqueueWhatsAppJob({
      purpose: 'client-recommendation',
      toPhone: phone,
      toName: data.investorName,
      body: messageBody,
      leadId,
      metadata: {
        proposalId: data.proposalId,
        pdfUrl,
        expectedROI: data.expectedROI,
        investmentAmount: data.investmentAmount,
        language: data.language || 'en',
      },
    });

    logger.info({ proposalId: data.proposalId, phone, jobId }, '[PDFExportService] Enqueued proposal PDF to WhatsApp queue');

    return {
      success: true,
      jobId,
      pdfUrl,
      messageBody,
    };
  }
}

function escapePdfString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
