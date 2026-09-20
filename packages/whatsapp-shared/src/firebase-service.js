/**
 * WhatsApp Agent — Database Service (Supabase-only)
 *
 * Originally `firebase-service.js`. Migrated to Supabase on 2026-09-20.
 * Firestore/RTDB fallback branches removed — Supabase is the single source of truth.
 *
 * Tables touched:
 *   - whatsapp_queue (status: pending|sent, sent_at)
 *   - leads         (phone, qualification, status, name)
 *   - stakeholders  (alias for leads via TABLE_COLLECTION_MAP)
 *   - notifications (type, title, message, read, created_at)
 *   - activities    (audit log of qualification events)
 */

const path = require('path');
const fs = require('fs');

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://REDACTED-PROJECT.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && !url.includes('placeholder')) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      return supabase;
    } catch (e) {
      console.warn('⚠️ [WhatsApp Agent] Failed to construct Supabase client:', e.message);
      return null;
    }
  }
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ [WhatsApp Agent] Supabase env vars missing — running in standalone queue mode.');
  }
  return null;
}

/**
 * @deprecated Kept for backward compatibility with callers that import { initFirebase }.
 * Returns null — there is no more Firebase to initialise. Use getSupabase() instead.
 */
function initFirebase() {
  return null;
}

async function getPendingQueueMessages() {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('whatsapp_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(10);
  if (error) {
    console.warn('⚠️ Supabase getPendingQueueMessages error:', error.message);
    return [];
  }
  if (!data || data.length === 0) return [];
  return data.map(d => ({
    id: d.id,
    recipient: d.recipient || d.phone,
    message: d.message,
    status: d.status,
    ...d,
  }));
}

async function markQueueMessageSent(id) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from('whatsapp_queue')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error(`Failed to mark queue message ${id} as sent:`, error.message);
}

async function getLeadByPhone(phone) {
  const clean = phone.replace(/\D/g, '');
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('leads')
    .select('*')
    .ilike('phone', `%${clean}%`)
    .limit(1);
  if (error) {
    console.warn('⚠️ Supabase getLeadByPhone error:', error.message);
    return null;
  }
  return data && data[0] ? data[0] : null;
}

const emailService = require('./email-service');

async function updateLeadQualification(phone, qualData, clientName = '') {
  const clean = phone.replace(/\D/g, '');
  const sb = getSupabase();
  if (!sb) return;

  let resolvedName = clientName || qualData.client_name || 'Client';

  // 1) Update leads table
  try {
    const { data: leadRows, error: leadErr } = await sb
      .from('leads')
      .select('id, name, client_name')
      .ilike('phone', `%${clean}%`)
      .limit(1);

    if (leadErr) throw leadErr;

    if (leadRows && leadRows.length > 0) {
      const row = leadRows[0];
      resolvedName = resolvedName || row.name || row.client_name || 'Client';

      const { error: updErr } = await sb
        .from('leads')
        .update({
          qualification: qualData,
          status: 'qualified',
          name: resolvedName,
          lead_ready: qualData.lead_ready ?? true,
          client_name: qualData.client_name || resolvedName,
          preferred_viewing: qualData.preferred_viewing || '',
          move_in_date: qualData.move_in_date || '',
          lease_duration: qualData.lease_duration || qualData.duration || '',
          duration: qualData.lease_duration || qualData.duration || '',
          budget: qualData.budget || '',
          currency: qualData.currency || 'EGP',
          locations: qualData.locations || [],
          bedrooms: qualData.bedrooms || '',
          furnishing_status: qualData.furnishing_status || (qualData.furnished ? 'Furnished' : 'Unfurnished'),
          special_notes: qualData.special_notes || '',
          qualified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updErr) throw updErr;
      console.log(`🎯 [Lead Qualified in DB]: Updated qualification for phone ${clean}`);
    }
  } catch (err) {
    console.warn('⚠️ Supabase updateLeadQualification (leads) warning:', err.message);
  }

  // 2) Update stakeholders table if present (leads alias)
  try {
    const { data: stakeRows } = await sb
      .from('stakeholders')
      .select('id, name')
      .ilike('phone', `%${clean}%`)
      .limit(1);

    if (stakeRows && stakeRows.length > 0) {
      const stake = stakeRows[0];
      resolvedName = resolvedName || stake.name || 'Client';

      await sb.from('stakeholders').update({
        stage: 'S3',
        notes: `Qualified via WhatsApp: Viewing: ${qualData.preferred_viewing || 'TBD'}, Move-in: ${qualData.move_in_date || 'TBD'}, Budget: ${qualData.budget || 'TBD'} ${qualData.currency || 'EGP'}, Status: ${qualData.furnishing_status || 'Standard'}`,
        updated_at: new Date().toISOString(),
      }).eq('id', stake.id);
    }
  } catch (err) {
    console.warn('⚠️ Supabase stakeholders update warning:', err.message);
  }

  // 3) Activity log
  try {
    const locText = Array.isArray(qualData.locations) ? qualData.locations.join(', ') : (qualData.locations || 'New Cairo');
    await sb.from('activities').insert({
      id: `act-qual-${clean}-${Date.now()}`,
      type: 'lead_qualified',
      actor_id: 'whatsapp-agent',
      actor_name: 'Hermes WhatsApp Concierge',
      description: `Client ${resolvedName || 'Client'} (+${clean}) is ready for viewing: ${qualData.preferred_viewing || 'Flexible'} (${locText})`,
      text: `🎯 Hot Lead Ready for Viewing: ${resolvedName || 'Client'} (+${clean})`,
      color: '#22c55e',
      related_type: 'lead',
      related_id: clean,
      metadata: { qualData, locations: locText },
    });
  } catch (actErr) {
    console.warn('⚠️ Could not insert Supabase activity log:', actErr.message);
  }

  // 4) Notification to admin dashboard
  try {
    const locText = Array.isArray(qualData.locations) ? qualData.locations.join(', ') : (qualData.locations || 'New Cairo');
    await sb.from('notifications').insert({
      type: 'lead',
      title: '🎯 Hot Lead Ready for Viewing!',
      title_ar: '🎯 عميل مؤهل جاهز للمعاينة!',
      message: `Client ${resolvedName || 'Client'} (+${clean}) is ready for viewing: ${qualData.preferred_viewing || 'Flexible'} (${locText})`,
      message_ar: `العميل ${resolvedName || 'العميل'} جاهز للمعاينة: ${qualData.preferred_viewing || 'مرن'} في ${locText}`,
      read: false,
      created_at: new Date().toISOString(),
    });
    console.log('🔔 [Real-Time Admin Alert]: Notification dispatched to Admin Dashboard.');
  } catch (notifErr) {
    console.warn('⚠️ Could not insert notification:', notifErr.message);
  }

  // 5) Email dispatch
  try {
    await emailService.sendLeadQualificationAlert({
      phone: clean,
      name: resolvedName || 'Valued Client',
      qualData,
    });
  } catch (emailErr) {
    console.warn('⚠️ Email dispatch warning:', emailErr.message);
  }
}

/**
 * Returns the Supabase client (was: returns the Firestore db handle).
 * Kept for backward compatibility with callers that import { getAdminDb }.
 */
const getAdminDb = () => getSupabase();

/**
 * Returns a no-op mock collection. Kept for backward compatibility with
 * callers that import { adminDb } and chain `.collection(...).add(...)` etc.
 * In production with a working Supabase client this is never reached.
 */
const createMockCollection = () => {
  const chain = {
    doc: () => ({
      set: async () => {},
      update: async () => {},
      get: async () => ({ exists: false, data: () => ({}) }),
    }),
    add: async () => ({ id: 'mock_' + Date.now() }),
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    get: async () => ({ empty: true, docs: [] }),
  };
  return chain;
};

const adminDb = new Proxy({}, {
  get(target, prop) {
    const sb = getSupabase();
    if (!sb) return () => createMockCollection();
    const val = sb[prop];
    return typeof val === 'function' ? val.bind(sb) : val;
  },
});

module.exports = {
  initFirebase, // deprecated, returns null — kept for backward compat
  getAdminDb,  // now returns the Supabase client
  adminDb,      // now proxies to the Supabase client
  getPendingQueueMessages,
  markQueueMessageSent,
  getLeadByPhone,
  updateLeadQualification,
};
