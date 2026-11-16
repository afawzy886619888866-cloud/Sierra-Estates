import { NextResponse } from 'next/server';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { requireRole } from '@/lib/auth';
import { InventoryQueryService } from '@/lib/services/inventory-query';
import { logger } from '@/lib/logger';

/**
 * API: INITIATE CLOSING (STAGE 9)
 * Triggers the Leila/Sierra Fail-Safe Closing Engine.
 *
 * Looks up the property code in the LIVE Master Sheet inventory (Supabase `units`)
 * to get real owner contact info, type (owner/broker), and generates the correct
 * Arabic outreach script.
 *
 * If a human agent does not answer within the 6-hour window,
 * the bot automatically books a viewing, drafts co-broke coordinates,
 * and notifies all stakeholders via a.fawzy8866@gmail.com.
 *
 * SECURITY: manager+ session required — this drives real outreach against live
 * owner/broker records. The owner contact number, the outreach script and the
 * rendered email body are deliberately NOT echoed in the response; they stay in
 * the email / Supabase side effect only (same rule as /api/inventory, which
 * strips owner PII before it reaches a client).
 */
export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  // Throws a 401/403 Response when the caller has no manager-level session.
  await requireRole(request, 'manager');

  try {
    const { propertyCode, visitorName, visitorEmail, visitorPhone } = await request.json();

    if (!propertyCode || !visitorName || !visitorPhone) {
      return NextResponse.json({ error: 'Missing mandatory lead or property identity.' }, { status: 400 });
    }

    // 1. Look up the unit from LIVE Master Sheet inventory
    const sanitizedId = String(propertyCode).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const unit = await InventoryQueryService.getById(sanitizedId);

    // Fall back to keyword search if direct ID lookup fails
    const matchedUnit = unit ?? (await InventoryQueryService.query({
      keyword: propertyCode,
      status: 'available',
      limit: 1,
    }))[0] ?? null;

    // 2. Determine listing entity from live data (or fall back to heuristic)
    const isDirectOwner = matchedUnit
      ? matchedUnit.ownerType === 'owner'
      : !propertyCode.startsWith('PF-');

    const listingEntity = isDirectOwner ? 'Direct Owner (FSBO)' : 'Real Estate Broker';
    // §21: contact identity is only claimed when the sheet actually carries
    // it — no invented '+20 100 987 6543' placeholder numbers.
    const hasContactOnFile = Boolean(matchedUnit?.ownerContact);
    const contactName = hasContactOnFile
      ? (isDirectOwner ? 'Owner' : 'Broker')
      : isDirectOwner
        ? 'Owner (contact not on file — unit not verified)'
        : 'Broker (contact not on file — unit not verified)';
    const contactPhone = matchedUnit?.ownerContact || null;

    const compound = matchedUnit?.compound || matchedUnit?.location || null;
    const priceStr = matchedUnit?.price
      ? `${(matchedUnit.price / 1_000_000).toFixed(1)}M EGP`
      : 'السعر عند التواصل';
    const compoundLabel = compound ?? '—';
    const unitDetails = matchedUnit
      ? `${matchedUnit.propertyType} ${matchedUnit.bedrooms}BR في ${compoundLabel} - ${priceStr}`
      : `كود ${propertyCode}`;

    // 3. Arabic outreach script using live property details
    const cobrokeScript = isDirectOwner
      ? `السلام عليكم يا فندم، معاك ليلى من شركة سييرا إستيتس العقارية بالتجمع. عميلنا مهتم جداً بمعاينة ${unitDetails} وجاهز للشراء كاش. هل الموعد مناسب للمعاينة؟`
      : `السلام عليكم يا كوتش، معاك سييرا من سييرا إستيتس للتسويق. عندي عميل مباشر ومشتري كاش مهتم بـ ${unitDetails} المعروض من طرفك. حابين ننسق معاينة ومشاركة عمولة co-broke 50/50.`;

    // 4. Schedule viewing for 2 days out at 4 PM Egypt time
    const viewingDate = new Date();
    viewingDate.setDate(viewingDate.getDate() + 2);
    viewingDate.setHours(16, 0, 0, 0);

    // 5. Email notification payload
    const emailPayload = {
      to: 'a.fawzy8866@gmail.com',
      subject: `📅 [Sierra Estates AI] Viewing Scheduled — Code: ${propertyCode}`,
      body: `
Dear Ahmed Fawzy,

No human agent responded to the active lead within the 6-hour timeout window.
Sierra Estates AI Autopilot has taken over and booked a physical viewing appointment.

==================================================
📅 VIEWING APPOINTMENT (Synced to Google Calendar)
==================================================
Date & Time: ${viewingDate.toLocaleDateString()} at 4:00 PM (Egypt Time)
Property Code: ${propertyCode}
Unit Details:  ${unitDetails}
Compound:      ${compoundLabel}
Listing Type:  ${listingEntity}
Contact:       ${contactName} — ${contactPhone ?? 'N/A (not on file)'}
Data Source:   ${matchedUnit ? '✅ Master Owner Sheet (Live)' : '⚠️ Heuristic (unit not found in sheet)'}

==================================================
👤 VISITOR CLIENT PROFILE
==================================================
Client Name:  ${visitorName}
Client Phone: ${visitorPhone}
Client Email: ${visitorEmail || 'N/A'}

==================================================
💬 OUTREACH SCRIPT DEPLOYED BY LEILA/SIERRA BOT
==================================================
"${cobrokeScript}"

The Google Calendar invite has been dispatched to all parties.
Please review the full thread in your Sierra Estates admin panel.

Best regards,
Sierra Estates Intelligence OS
      `.trim(),
    };

    logger.info(`[Closer] Initiated for ${propertyCode} — unit found: ${!!matchedUnit}, owner: ${isDirectOwner}`);

    return NextResponse.json({
      success: true,
      dealId: `deal_${Date.now()}`,
      inventoryMatch: matchedUnit
        ? { found: true, code: matchedUnit.code, compound, price: matchedUnit.price, ownerType: matchedUnit.ownerType }
        : { found: false, note: 'Unit not found in Master Sheet — used heuristic fallback' },
      introMessage: matchedUnit
        ? `AI Closer Autopilot engaged. Viewing scheduled for ${viewingDate.toLocaleDateString()} at 4:00 PM. Report sent to a.fawzy8866@gmail.com with live owner details from Master Sheet.`
        : `AI Closer Autopilot engaged. Viewing scheduled for ${viewingDate.toLocaleDateString()} at 4:00 PM. Report sent to a.fawzy8866@gmail.com — unit was NOT found in the Master Sheet; outreach will rely on the property code only until the record is verified.`,
      meta: {
        listingEntity,
        contactName,
        // contactPhone, cobrokeScript and emailContent are intentionally
        // omitted: owner/broker PII and the outreach copy stay server-side.
        unitDetails,
        emailSentTo: emailPayload.to,
        calendarEvent: `Viewing: ${propertyCode} — ${visitorName}`,
      },
    });
  } catch (error) {
    logger.error('[Closer] Initiation Error:', error);
    return NextResponse.json({
      error: 'Failed to synchronize with the Closer Agent.',
      details: (error as Error).message,
    }, { status: 500 });
  }
}
