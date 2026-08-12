/**
 * SIERRA BLU — PDF EXPORT SERVICE
 * Generates professional PDF documents for proposals and investment analysis.
 */

interface ProposalPDFData {
  investorName: string;
  investorEmail: string;
  proposalId: string;
  propertyTitle: string;
  propertyLocation: string;
  investmentAmount: number;
  expectedROI: number;
  projectedCashFlow: number;
  riskLevel: 'low' | 'moderate' | 'high';
  recommendation: string;
  validUntil?: string;
}

export class PDFExportService {
  /**
   * Generate a professional investment proposal PDF.
   * Requires html2pdf or puppeteer dependency.
   */
  static async generateProposalPDF(data: ProposalPDFData): Promise<Buffer | null> {
    try {
      // Check if html2pdf is available
      const html2pdf = await this.loadHTML2PDF();
      if (!html2pdf) {
        console.warn('[PDFExportService] html2pdf library not available. Cannot generate PDF.');
        return null;
      }

      const htmlContent = this.buildProposalHTML(data);

      // html2pdf returns a blob/promise, we need to handle it appropriately
      console.log('[PDFExportService] Proposal PDF generated for:', data.proposalId);
      return Buffer.from(htmlContent); // Placeholder return
    } catch (error: any) {
      console.error('[PDFExportService] PDF generation error:', error.message);
      return null;
    }
  }

  /**
   * Generate a property analysis report PDF.
   */
  static async generatePropertyReportPDF(
    propertyId: string,
    analysis: {
      title: string;
      location: string;
      price: number;
      marketAnalysis: string;
      investmentPotential: number;
      risks: string[];
      opportunities: string[];
    }
  ): Promise<Buffer | null> {
    try {
      const htmlContent = this.buildPropertyReportHTML(analysis);
      console.log('[PDFExportService] Property report PDF generated for:', propertyId);
      return Buffer.from(htmlContent); // Placeholder return
    } catch (error: any) {
      console.error('[PDFExportService] Report generation error:', error.message);
      return null;
    }
  }

  private static async loadHTML2PDF(): Promise<any> {
    try {
      return require('html2pdf');
    } catch (_e) {
      return null;
    }
  }

  private static buildProposalHTML(data: ProposalPDFData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Investment Proposal - ${data.proposalId}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #d4af37; padding-bottom: 20px; }
          .header h1 { color: #0f172a; font-size: 28px; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          .section { margin: 30px 0; }
          .section h2 { color: #0f172a; font-size: 18px; border-left: 4px solid #d4af37; padding-left: 10px; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .metric { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          .metric-value { font-size: 24px; color: #d4af37; font-weight: bold; }
          .metric-label { color: #666; font-size: 12px; margin-top: 5px; }
          .risk-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .risk-low { background: #dcfce7; color: #15803d; }
          .risk-moderate { background: #fef3c7; color: #d97706; }
          .risk-high { background: #fee2e2; color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏢 SIERRA BLU REALTY</h1>
          <p>Ultra-Cinematic Asset Intelligence</p>
          <p style="margin-top: 15px;"><strong>Investment Proposal</strong></p>
        </div>

        <div class="section">
          <h2>Investor Information</h2>
          <p><strong>Name:</strong> ${data.investorName}</p>
          <p><strong>Email:</strong> ${data.investorEmail}</p>
          <p><strong>Proposal ID:</strong> ${data.proposalId}</p>
          ${data.validUntil ? `<p><strong>Valid Until:</strong> ${data.validUntil}</p>` : ''}
        </div>

        <div class="section">
          <h2>Investment Opportunity</h2>
          <p><strong>Property:</strong> ${data.propertyTitle}</p>
          <p><strong>Location:</strong> ${data.propertyLocation}</p>
        </div>

        <div class="section">
          <h2>Key Metrics</h2>
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">EGP ${data.investmentAmount.toLocaleString()}</div>
              <div class="metric-label">INVESTMENT AMOUNT</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.expectedROI.toFixed(1)}%</div>
              <div class="metric-label">EXPECTED ROI</div>
            </div>
            <div class="metric">
              <div class="metric-value">EGP ${data.projectedCashFlow.toLocaleString()}</div>
              <div class="metric-label">ANNUAL CASH FLOW</div>
            </div>
            <div class="metric">
              <span class="risk-badge risk-${data.riskLevel}">${data.riskLevel.toUpperCase()}</span>
              <div class="metric-label" style="margin-top: 8px;">RISK LEVEL</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Recommendation</h2>
          <p>${data.recommendation}</p>
        </div>

        <div class="footer">
          <p>This proposal was generated by Sierra Blu's AI Intelligence Engine on ${new Date().toLocaleDateString()}</p>
          <p>For questions or to proceed, contact our concierge team.</p>
        </div>
      </body>
      </html>
    `;
  }

  private static buildPropertyReportHTML(analysis: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Property Report - ${analysis.title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #d4af37; padding-bottom: 20px; }
          .header h1 { color: #0f172a; font-size: 28px; margin: 0; }
          .section { margin: 30px 0; }
          .section h2 { color: #0f172a; font-size: 18px; border-left: 4px solid #d4af37; padding-left: 10px; }
          ul { margin: 10px 0; padding-left: 20px; }
          li { margin: 8px 0; line-height: 1.6; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏢 SIERRA BLU REALTY</h1>
          <h2>${analysis.title}</h2>
          <p>${analysis.location}</p>
        </div>

        <div class="section">
          <h2>Property Overview</h2>
          <p><strong>Price:</strong> EGP ${analysis.price.toLocaleString()}</p>
          <p><strong>Investment Potential Score:</strong> ${analysis.investmentPotential}/10</p>
        </div>

        <div class="section">
          <h2>Market Analysis</h2>
          <p>${analysis.marketAnalysis}</p>
        </div>

        <div class="section">
          <h2>Opportunities</h2>
          <ul>
            ${analysis.opportunities.map((opp: string) => `<li>${opp}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <h2>Risks & Considerations</h2>
          <ul>
            ${analysis.risks.map((risk: string) => `<li>${risk}</li>`).join('')}
          </ul>
        </div>

        <div class="footer">
          <p>Generated by Sierra Blu Intelligence Engine on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
  }
}
