/**
 * Sierra Estates - Supabase service for WhatsApp agents.
 *
 * The exported collection-shaped adapter is kept for backwards compatibility
 * with the shared agent modules, but all reads and writes go to Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const TABLES = {
  listings: 'listings',
  stakeholders: 'leads',
  leads: 'leads',
  whatsapp_queue: 'whatsapp_queue',
  unified_memory: 'unified_memory',
  viewing_appointments: 'viewing_appointments',
  notifications: 'notifications',
};

let client;

function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function tableFor(collection) {
  return TABLES[collection] || collection;
}

function createQuery(collection, filters = [], maxRows) {
  return {
    where(field, operator, value) {
      const next = [...filters, { field, operator, value }];
      return createQuery(collection, next, maxRows);
    },
    orderBy(field, direction = 'asc') {
      return {
        ...createQuery(collection, filters, maxRows),
        get: () => queryRows(collection, filters, maxRows, { field, direction }),
      };
    },
    limit(value) {
      return createQuery(collection, filters, value);
    },
    get: () => queryRows(collection, filters, maxRows),
  };
}

async function queryRows(collection, filters, maxRows, order) {
  const sb = getSupabase();
  if (!sb) return { empty: true, docs: [] };
  let query = sb.from(tableFor(collection)).select('*');
  for (const filter of filters) {
    if (filter.operator === '==') query = query.eq(filter.field, filter.value);
    else if (filter.operator === '!=') query = query.neq(filter.field, filter.value);
    else if (filter.operator === '>') query = query.gt(filter.field, filter.value);
    else if (filter.operator === '>=') query = query.gte(filter.field, filter.value);
    else if (filter.operator === '<') query = query.lt(filter.field, filter.value);
    else if (filter.operator === '<=') query = query.lte(filter.field, filter.value);
  }
  if (order) query = query.order(order.field, { ascending: order.direction !== 'desc' });
  if (maxRows) query = query.limit(maxRows);
  const { data, error } = await query;
  if (error) throw error;
  const docs = (data || []).map((row) => ({
    id: row.id,
    exists: true,
    data: () => row,
    get: (field) => row[field],
    ref: createDocRef(collection, row.id),
  }));
  return { empty: docs.length === 0, docs };
}

function createDocRef(collection, id) {
  return {
    id,
    async get() {
      const result = await queryRows(collection, [{ field: 'id', operator: '==', value: id }], 1);
      return result.docs[0] || { id, exists: false, data: () => undefined, get: () => undefined };
    },
    async set(data, options = {}) {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase is not configured');
      const payload = { ...data, id };
      const operation = options.merge ? sb.from(tableFor(collection)).upsert(payload) : sb.from(tableFor(collection)).insert(payload);
      const { error } = await operation;
      if (error) throw error;
    },
    async update(data) {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase is not configured');
      const { error } = await sb.from(tableFor(collection)).update(data).eq('id', id);
      if (error) throw error;
    },
    async delete() {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase is not configured');
      const { error } = await sb.from(tableFor(collection)).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

const adminDb = {
  collection(collection) {
    return {
      ...createQuery(collection),
      id: collection,
      doc(id) {
        return createDocRef(collection, id || randomUUID());
      },
      async add(data) {
        const sb = getSupabase();
        if (!sb) throw new Error('Supabase is not configured');
        const id = data.id || randomUUID();
        const { error } = await sb.from(tableFor(collection)).insert({ ...data, id });
        if (error) throw error;
        return createDocRef(collection, id);
      },
    };
  },
};

async function getPendingQueueMessages() {
  const snapshot = await adminDb.collection('whatsapp_queue').where('status', '==', 'pending').limit(10).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function markQueueMessageSent(id) {
  await adminDb.collection('whatsapp_queue').doc(id).update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function getLeadByPhone(phone) {
  const clean = phone.replace(/\D/g, '');
  const snapshot = await adminDb.collection('leads').where('phone', '==', clean).limit(1).get();
  return snapshot.docs[0]?.data() || null;
}

async function updateLeadQualification(phone, qualData, clientName = '') {
  const clean = phone.replace(/\D/g, '');
  const lead = await getLeadByPhone(clean);
  if (!lead) return;
  await adminDb.collection('leads').doc(lead.id).update({
    qualification: qualData,
    status: 'qualified',
    full_name: clientName || qualData.client_name || lead.full_name,
    updated_at: new Date().toISOString(),
  });
  await adminDb.collection('activities').add({
    type: 'lead_qualified',
    actor_name: 'Hermes WhatsApp Concierge',
    description: `Lead ${clientName || lead.full_name || clean} qualified for viewing.`,
    related_type: 'lead',
    related_id: lead.id,
    metadata: { qualData },
  });
}

const initFirebase = () => {
  throw new Error('Firebase has been retired. Configure Supabase service-role access instead.');
};
const getAdminDb = () => adminDb;

module.exports = {
  initFirebase,
  getAdminDb,
  adminDb,
  getPendingQueueMessages,
  markQueueMessageSent,
  getLeadByPhone,
  updateLeadQualification,
};
