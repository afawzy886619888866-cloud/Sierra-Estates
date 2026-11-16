/**
 * Email Alert Service for Sierra Estates
 *
 * Sends high-priority admin notifications whenever:
 *  1. A new property listing is submitted via Add Listing / Easy Listing.
 *  2. A new VIP inquiry / Black Friday request is received.
 *
 * Transports supported:
 *  - Resend REST API (via process.env.RESEND_API_KEY)
 *  - Google Apps Script MailApp Relay (via process.env.SHEETS_WEBAPP_URL or APPS_SCRIPT_URL)
 *  - SendGrid / Generic Webhook if configured
 */

import { logger } from '../logger';

export interface ListingNotificationData {
  code: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  price: number;
  beds: number;
  baths: number;
  area: number;
  finishing?: string;
  ownerName: string;
  ownerType: string;
  mobile: string;
  comment?: string;
  sheetRowUrl?: string;
  websiteUrl?: string;
  employeeName?: string;
  submitterType?: string;
}

export async function sendNewListingEmailAlert(data: ListingNotificationData): Promise<boolean> {
  const recipient =
    process.env.ADMIN_NOTIFY_EMAIL ||
    process.env.ADMIN_BOOTSTRAP_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'info@sierra-estates.net';

  const subject = `🏡 [New Unit Alert] ${data.compound} - ${data.propertyType} (${data.mode.toUpperCase()}) · ${data.code}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #070b12; color: #f0f4f8; padding: 24px; margin: 0; }
    .card { max-width: 600px; margin: 0 auto; background: #0f1722; border: 1.5px solid #c8961a; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: #c8961a; color: #070b12; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 12px; }
    h1 { font-size: 22px; color: #ffffff; margin: 0 0 8px; }
    .price { font-size: 20px; font-weight: 900; color: #e9c176; margin-bottom: 18px; }
    .specs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
    .spec-item { background: #162231; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
    .spec-label { font-size: 11px; color: #94a3b8; display: block; margin-bottom: 2px; }
    .spec-val { font-size: 14px; font-weight: 700; color: #ffffff; }
    .notes-box { background: #162231; border-radius: 8px; padding: 12px; font-size: 13px; color: #cbd5e1; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.08); white-space: pre-wrap; }
    .btn { display: inline-block; background: linear-gradient(135deg, #c8961a 0%, #a4760d 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 8px; margin-right: 10px; }
    .footer { font-size: 11px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Sierra Estates · New Property Notification</div>
    <h1>${data.propertyType} in ${data.compound}</h1>
    <div class="price">EGP ${Number(data.price).toLocaleString('en-US')} (${data.mode.toUpperCase()})</div>

    <div class="specs-grid">
      <div class="spec-item">
        <span class="spec-label">Unit Code / كود الوحدة</span>
        <span class="spec-val" style="color: #e9c176; font-family: monospace;">${data.code}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Area / المساحة</span>
        <span class="spec-val">${data.area} m²</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Bedrooms & Baths / غرف وحمامات</span>
        <span class="spec-val">${data.beds} Beds · ${data.baths} Baths</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Finishing / التشطيب</span>
        <span class="spec-val">${data.finishing || 'Fully Finished'}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Publisher Role / الصفة</span>
        <span class="spec-val">${data.ownerType} (${data.ownerName})</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Contact Mobile / الهاتف</span>
        <span class="spec-val" style="font-family: monospace;">${data.mobile}</span>
      </div>
      ${
        data.employeeName
          ? `
      <div class="spec-item" style="grid-column: span 2;">
        <span class="spec-label">Assigned Sierra Employee / موظف سييرا</span>
        <span class="spec-val" style="color: #38bdf8;">${data.employeeName}</span>
      </div>`
          : ''
      }
    </div>

    ${
      data.comment
        ? `
    <div class="spec-label" style="margin-bottom: 6px;">Notes / ملاحظات الإعلان:</div>
    <div class="notes-box">${data.comment}</div>`
        : ''
    }

    <div style="margin-top: 20px;">
      ${data.websiteUrl ? `<a href="${data.websiteUrl}" class="btn">View on Website</a>` : ''}
      ${data.sheetRowUrl ? `<a href="${data.sheetRowUrl}" class="btn" style="background: #10b981;">Open Google Sheet</a>` : ''}
    </div>

    <div class="footer">
      Automated alert from Sierra Estates Universal Intake Engine · Cairo, Egypt
    </div>
  </div>
</body>
</html>
  `.trim();

  // 1. Resend API Attempt
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Sierra Estates Alerts <alerts@sierra-estates.net>',
          to: recipient,
          subject,
          html: htmlContent,
        }),
      });

      if (res.ok) {
        logger.info(`[EMAIL_ALERT] Resend notification delivered to ${recipient} for ${data.code}`);
        return true;
      }
    } catch (resendErr) {
      logger.warn('[EMAIL_ALERT] Resend send attempt failed:', resendErr);
    }
  }

  // 2. Google Apps Script MailApp Relay Attempt
  // Fail-closed: env-only relay URL (no hardcoded Apps Script deployment URL).
  const scriptUrl =
    process.env.SHEETS_WEBAPP_URL ||
    process.env.APPS_SCRIPT_URL ||
    '';

  const secret =
    process.env.SIERRA_SECRET_KEY ||
    process.env.SHEETS_WEBAPP_SECRET ||
    '';

  if (scriptUrl) {
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          secret,
          mode: 'send_email_notification',
          recipient,
          subject,
          htmlBody: htmlContent,
          code: data.code,
        }),
        redirect: 'follow',
      });

      if (res.ok) {
        logger.info(`[EMAIL_ALERT] Google MailApp relay delivered notification to ${recipient} for ${data.code}`);
        return true;
      }
    } catch (scriptErr) {
      logger.warn('[EMAIL_ALERT] Apps Script mail relay failed:', scriptErr);
    }
  }

  logger.info(`[EMAIL_ALERT] Notice generated for ${data.code} to ${recipient}`);
  return false;
}
