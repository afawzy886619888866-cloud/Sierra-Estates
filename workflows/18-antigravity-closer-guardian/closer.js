'use strict';
/**
 * Guardian Bot 4 — Buyer Concierge, Matchmaker & Closer Guardian
 * ("Antigravity" + Stage-9 Closer).
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 4 (2026-11-01). Owns the buyer journey end-to-end:
 *
 *   · Responds to Property Finder + Website inquiries in seconds with the
 *     Sierra Estates Advisory Script — "AI Discovers. We Advise. You
 *     Decide." — telling the client we are verifying owner availability
 *     within 24 h, and sending the Client Request Form link with the 25 %
 *     Website Commission Discount incentive.
 *   · Runs matchPropertiesToLead → Top 3–5 matching units from
 *     Real_Available_Units; notifies the assigned Sales Rep (Telegram +
 *     Admin OS activity).
 *   · Viewing confirmation → Google Calendar API booking + calendar invites
 *     + emails to CEO, Team Leader and Responsible Sales Advisor, followed
 *     by the 60-Minute Golden Hour follow-up tracker.
 *
 * Cadence: every 15 minutes (runner cron lane).
 */

const { supabase, withBackoff, runGuardian } = require('../lib/guardian-kit');
const { resolveCanonicalCompound } = require('../lib/compound-canonical');

const CLIENT_REQUEST_FORM_URL = process.env.CLIENT_REQUEST_FORM_URL || 'https://sierra-estates.net/client-request';
const WEBSITE_COMMISSION_DISCOUNT = '25%';

const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const SALES_REP_CHAT_ID = String(process.env.TELEGRAM_SALES_REP_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();

// ── Advisory Script (Sierra Estates tone) ──────────────────────────────────
function advisoryReply(lead) {
  const name = String(lead.name || lead.full_name || '').trim() || 'there';
  return [
    `Dear ${name}, thank you for your interest in Sierra Estates 🏛️`,
    ``,
    `AI Discovers. We Advise. You Decide.`,
    ``,
    `We are verifying the owner's availability for this unit and will confirm within 24 hours.`,
    `In the meantime, complete our Client Request Form so our advisory team can shortlist the best options for you:`,
    `${CLIENT_REQUEST_FORM_URL}`,
    `💡 Clients who submit the website form receive a ${WEBSITE_COMMISSION_DISCOUNT} commission discount.`,
    ``,
    `Sierra Estates — Cairo's AI-powered advisory.`,
  ].join('\n');
}

// ── matchPropertiesToLead (workflow-side implementation) ────────────────────
/** Scores Real_Available_Units against a lead brief; returns the Top N. */
async function matchPropertiesToLead(sb, lead, topN = 5) {
  let wantRent = null;
  const intent = String(lead.intent || lead.interest || '').toLowerCase();
  if (/rent|إيجار|ايجار/.test(intent)) wantRent = true;
  else if (/buy|sale|purchase|شراء/.test(intent)) wantRent = false;

  const budget = Number(String(lead.budget || lead.max_price || '').replace(/[^\d.]/g, '')) || null;
  const compoundHint = resolveCanonicalCompound(lead.compound || lead.area || '');
  const bedsWanted = Number(lead.bedrooms) || null;

  let units = [];
  try {
    const { data, error } = await sb.from('real_available_units')
      .select('id,code,compound,deal_type,property_type,price,bedrooms,bathrooms,area_sqm,furnishing_status,finishing_type,ai_fair_price,is_featured_gem')
      .limit(500);
    if (error) throw error;
    units = data || [];
  } catch (_) { return []; }

  const scored = [];
  for (const u of units) {
    let score = 0;
    const isRent = String(u.deal_type).toLowerCase() === 'rent';
    if (wantRent !== null) {
      if (wantRent === isRent) score += 40; else continue; // deal-type mismatch is disqualifying
    }
    if (budget) {
      const price = Number(u.price) || 0;
      if (price > 0) {
        const ratio = price / budget;
        if (ratio <= 1 && ratio >= 0.6) score += 35; // comfortable fit
        else if (ratio <= 1.15) score += 15; // slight stretch
        else continue; // far over budget
      }
    }
    if (compoundHint && String(u.compound) === compoundHint) score += 25;
    if (bedsWanted && Number(u.bedrooms) === bedsWanted) score += 15;
    if (u.is_featured_gem) score += 8;
    if (u.ai_fair_price && Number(u.price) && Number(u.price) < Number(u.ai_fair_price)) score += 5; // below fair value
    scored.push({ unit: u, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((s) => ({ ...s.unit, matchScore: s.score }));
}

// ── notifications ───────────────────────────────────────────────────────────
async function notifySalesRep(text) {
  if (!TELEGRAM_BOT_TOKEN || !SALES_REP_CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: SALES_REP_CHAT_ID, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (_) { return false; }
}

function renderRepBrief(lead, matches) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = [
    `🎯 <b>New Buyer Inquiry — Top ${matches.length} Matches</b>`,
    `Lead: ${esc(lead.name || lead.full_name || lead.email || lead.id)}${lead.phone ? ` · ${esc(lead.phone)}` : ''}`,
    ``,
  ];
  matches.forEach((m, i) => {
    lines.push(`${i + 1}. <code>${esc(m.code || m.id)}</code> — ${esc(resolveCanonicalCompound(m.compound))} · ${m.bedrooms ?? '?'}BR · ${Number(m.price).toLocaleString('en-US')} EGP${String(m.deal_type).toLowerCase() === 'rent' ? '/mo' : ''}${m.is_featured_gem ? ' 💎' : ''}`);
  });
  lines.push('');
  lines.push(`Advisory reply + Client Request Form (${WEBSITE_COMMISSION_DISCOUNT} discount) already sent. Verify owner availability within 24h.`);
  return lines.join('\n');
}

// ── Google Calendar booking ─────────────────────────────────────────────────
async function bookViewingOnCalendar(viewing) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return { ok: false, note: 'GOOGLE_CALENDAR_ID not set (booking queued in CRM only)' };
  try {
    const { createSheetsClient } = require('../lib/google-sheets');
    // The service account (GOOGLE_SERVICE_ACCOUNT_JSON) is reused for the
    // Calendar scope when the calendar is shared with the service account.
    const google = require('googleapis').google;
    const auth = new google.auth.GoogleAuth({
      keyFile: undefined,
      credentials: JSON.parse(Buffer.from(String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'base64').toString('utf8')),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const cal = google.calendar({ version: 'v3', auth });
    const start = new Date(viewing.scheduled_at);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const attendees = [
      viewing.client_email, viewing.ceo_email, viewing.team_leader_email, viewing.sales_advisor_email,
    ].filter(Boolean).map((email) => ({ email }));
    const event = {
      summary: `Sierra Estates Viewing — ${viewing.unit_code}`,
      description: `Property viewing with Sierra Estates advisory.\nUnit: ${viewing.unit_code}\nSales advisor: ${viewing.sales_advisor_email || 'TBD'}\nQuote the unit code to the concierge for owner contact.`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees,
      reminders: { useDefault: true },
    };
    const res = await cal.events.insert({ calendarId, resource: event, sendUpdates: 'all' });
    return { ok: true, eventId: res.data.id, htmlLink: res.data.htmlLink };
  } catch (e) {
    return { ok: false, note: e.message.slice(0, 200) };
  }
}

// ── the guardian ────────────────────────────────────────────────────────────
async function closerGuardian(ctx) {
  const sb = supabase();
  const stats = { inquiriesAnswered: 0, matches: 0, repsNotified: 0, viewingsBooked: 0, goldenHourTracked: 0 };

  // ── 1. Fresh inquiries (PF + website) awaiting the advisory reply ────────
  let freshLeads = [];
  try {
    const { data, error } = await withBackoff(() => sb.from('leads')
      .select('id,name,full_name,email,phone,intent,interest,compound,area,budget,max_price,bedrooms,source,ai_reply_sent,status,created_at')
      .in('source', ['property_finder', 'website', 'Property Finder', 'Website', 'portal'])
      .or('ai_reply_sent.is.false,ai_reply_sent.is.null')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100), 'fresh-leads');
    if (error) throw error;
    freshLeads = data || [];
  } catch (e) { ctx.log(`leads read failed: ${e.message}`); }

  for (const lead of freshLeads) {
    // Advisory Script reply (logged to the CRM timeline; the send lane is
    // the whatsapp_queue / email lane depending on contact channel).
    const reply = advisoryReply(lead);
    try {
      await withBackoff(() => sb.from('whatsapp_queue').insert({
        phone: lead.phone || '',
        message: reply,
        reference: `advisory-reply:${lead.id}`,
        status: lead.phone ? 'queued' : 'skipped',
        created_at: new Date().toISOString(),
      }), `advisory:${lead.id}`);
    } catch (e) { ctx.log(`advisory enqueue failed ${lead.id}: ${e.message}`); }
    stats.inquiriesAnswered++;

    // ── 2. matchPropertiesToLead → Top 3–5 + Sales Rep notification ──────
    const matches = await matchPropertiesToLead(sb, lead, 5);
    stats.matches += matches.length;
    try {
      await withBackoff(() => sb.from('leads').update({
        ai_reply_sent: true,
        ai_reply_at: new Date().toISOString(),
        matched_units: matches.map((m) => ({ code: m.code || m.id, compound: m.compound, price: m.price, score: m.matchScore })),
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id), `lead-update:${lead.id}`);
    } catch (e) { ctx.log(`lead update failed ${lead.id}: ${e.message}`); }

    if (matches.length) {
      const notified = await notifySalesRep(renderRepBrief(lead, matches));
      if (notified) stats.repsNotified++;
      await ctx.activity('antigravity-closer-guardian',
        `🎯 Buyer inquiry matched to ${matches.length} verified units — sales rep notified.`,
        { lead: lead.id, top: matches[0] ? matches[0].code : null });
    }

    await ctx.learn('antigravity-closer-guardian', {
      kind: 'buyer_inquiry',
      title: `Inquiry ${lead.id} — ${matches.length} matches`,
      body: { lead: { source: lead.source, compound: lead.compound, budget: lead.budget }, topMatches: matches.slice(0, 3).map((m) => m.code) },
      tags: ['buyer', 'matching'],
      ttlDays: 60,
    });
  }

  // ── 3. Viewing confirmations → Calendar booking + Golden Hour tracker ───
  let viewings = [];
  try {
    const { data, error } = await withBackoff(() => sb.from('viewings')
      .select('id,lead_id,unit_code,listing_id,scheduled_at,status,client_email,ceo_email,team_leader_email,sales_advisor_email,calendar_event_id,golden_hour_at,created_at')
      .eq('status', 'confirmed')
      .or('calendar_event_id.is.null,golden_hour_at.is.null')
      .limit(50), 'confirmed-viewings');
    if (error) throw error;
    viewings = data || [];
  } catch (e) {
    ctx.log(`viewings read failed (table present?): ${e.message}`);
  }

  for (const v of viewings) {
    const patch = {};
    if (!v.calendar_event_id) {
      const booking = await bookViewingOnCalendar(v);
      if (booking.ok) {
        patch.calendar_event_id = booking.eventId;
        patch.calendar_link = booking.htmlLink;
        stats.viewingsBooked++;
        await ctx.activity('antigravity-closer-guardian',
          `📅 Viewing booked via Google Calendar — ${v.unit_code} @ ${v.scheduled_at}. Invites dispatched to CEO, Team Leader and Sales Advisor.`,
          { viewing: v.id, unit: v.unit_code });
      } else {
        await ctx.learn('antigravity-closer-guardian', {
          kind: 'calendar_failure',
          title: `Calendar booking failed — viewing ${v.id}`,
          body: booking,
          tags: ['calendar', 'ops'],
          ttlDays: 14,
        });
      }
    }
    if (!v.golden_hour_at) {
      // 60-Minute Golden Hour: first follow-up checkpoint 60 min after the
      // viewing slot ends. The lead-timers cron lane (app/api/cron/lead-timers)
      // fires the actual follow-up; this guardian owns the tracking stamp.
      const scheduledEnd = new Date(new Date(v.scheduled_at).getTime() + 60 * 60 * 1000);
      patch.golden_hour_at = scheduledEnd.toISOString();
      stats.goldenHourTracked++;
    }
    if (Object.keys(patch).length) {
      try {
        await withBackoff(() => sb.from('viewings').update(patch).eq('id', v.id), `viewing:${v.id}`);
      } catch (e) { ctx.log(`viewing update failed ${v.id}: ${e.message}`); }
    }
  }

  return stats;
}

if (require.main === module) {
  runGuardian({
    botId: 'antigravity-closer-guardian',
    name: 'Buyer Concierge, Matchmaker & Closer Guardian',
    cron: '*/15 * * * *',
    fn: closerGuardian,
  })();
}

module.exports = {
  closerGuardian,
  matchPropertiesToLead,
  advisoryReply,
  renderRepBrief,
  bookViewingOnCalendar,
};
