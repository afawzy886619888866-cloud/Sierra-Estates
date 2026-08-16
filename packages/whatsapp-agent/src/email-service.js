/**
 * Email Dispatcher Service for Sierra Estates Lead Qualification Alerts
 * Sends instant structured lead notifications to Admin & Sales Team.
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@sierra-estates.net';
    this.salesEmail = process.env.SALES_ALERT_EMAIL || 'sales@sierra-estates.net';
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        console.log('📧 [EmailService] SMTP transporter initialized.');
      } catch (err) {
        console.warn('⚠️ [EmailService] SMTP initialization warning:', err.message);
      }
    }
  }

  /**
   * Dispatch an instant email alert when a client completes 3-Stage qualification
   */
  async sendLeadQualificationAlert({ phone, name, qualData }) {
    const viewing = qualData.preferred_viewing || 'Not specified';
    const moveIn = qualData.move_in_date || 'Immediate / Flexible';
    const duration = qualData.duration || 'Standard';
    const budget = qualData.budget || 'Flexible';
    const locations = Array.isArray(qualData.locations) ? qualData.locations.join(', ') : (qualData.locations || 'New Cairo');
    const bedrooms = qualData.bedrooms || 'Any';
    const furnished = qualData.furnished ? 'Yes (Furnished)' : 'No / Unfurnished';

    const subject = `🔥 [Hot Lead Ready] Viewing Request - ${name || phone} (${locations})`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b132b; color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #1e293b;">
        <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #06b6d4; margin: 0; font-size: 22px;">SIERRA ESTATES REALTY</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">AI Qualified Lead & Viewing Alert</p>
        </div>

        <div style="background: rgba(6, 182, 212, 0.1); border-left: 4px solid #06b6d4; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38bdf8;">Status:</strong> <span style="color: #10b981; font-weight: bold;">STAGE 3 QUALIFIED · READY FOR VIEWING</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; width: 40%;">Client Name:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: bold;">${name || 'Client'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Phone Number:</td>
            <td style="padding: 8px 0; color: #38bdf8; font-weight: bold;">+${phone.replace(/\D/g, '')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Preferred Viewing:</td>
            <td style="padding: 8px 0; color: #fbbf24; font-weight: bold;">${viewing}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Target Move-in Date:</td>
            <td style="padding: 8px 0; color: #ffffff;">${moveIn}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Target Duration:</td>
            <td style="padding: 8px 0; color: #ffffff;">${duration}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Approx. Budget:</td>
            <td style="padding: 8px 0; color: #34d399; font-weight: bold;">${budget}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Preferred Compounds:</td>
            <td style="padding: 8px 0; color: #ffffff;">${locations}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Bedrooms / Furnishing:</td>
            <td style="padding: 8px 0; color: #ffffff;">${bedrooms} Bedrooms · ${furnished}</td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://wa.me/${phone.replace(/\D/g, '')}" style="background: #25d366; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
            Chat on WhatsApp ↗
          </a>
          <a href="http://localhost:3001" style="background: #06b6d4; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open Admin CRM ↗
          </a>
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Sierra AI Assistant" <${process.env.SMTP_FROM || 'no-reply@sierra-estates.net'}>`,
          to: `${this.adminEmail}, ${this.salesEmail}`,
          subject,
          html,
        });
        console.log(`✉️ [EmailService] Instant email alert dispatched to ${this.adminEmail} & ${this.salesEmail}`);
      } catch (err) {
        console.warn('⚠️ [EmailService] Failed to send email via SMTP:', err.message);
      }
    } else {
      console.log(`✉️ [EmailService Dispatch Notification] To: ${this.adminEmail}, ${this.salesEmail} | Subject: ${subject}`);
    }
  }
}

module.exports = new EmailService();
