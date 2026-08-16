/**
 * Firebase Admin Service for WhatsApp Agent
 * Connects to Firestore to pull automated outreach queues (Property Finder leads)
 * and syncs lead interaction context.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;

function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    return db;
  }

  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                               path.resolve(__dirname, '../../../service-account.json');

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: process.env.FIREBASE_PROJECT_ID || sa.project_id,
      });
      db = admin.firestore();
      console.log('🔥 [WhatsApp Agent] Connected to Firestore via FIREBASE_SERVICE_ACCOUNT_JSON.');
      return db;
    } else if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        projectId: process.env.FIREBASE_PROJECT_ID || 'sierra-estates-realty',
      });
      db = admin.firestore();
      console.log('🔥 [WhatsApp Agent] Connected to Firestore via service-account.json.');
      return db;
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      db = admin.firestore();
      console.log(`🔥 [WhatsApp Agent] Connected to Firestore project: ${process.env.FIREBASE_PROJECT_ID}`);
      return db;
    } else {
      console.warn('⚠️ [WhatsApp Agent] No Firebase credentials found. Running in standalone queue mode.');
      return null;
    }
  } catch (err) {
    console.warn('⚠️ [WhatsApp Agent] Firebase initialization warning:', err.message);
    return null;
  }
}

async function getPendingQueueMessages() {
  if (!db) db = initFirebase();
  if (!db) return [];

  try {
    const snap = await db.collection('whatsapp_queue')
      .where('status', '==', 'pending')
      .limit(10)
      .get();

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err) {
    return [];
  }
}

async function markQueueMessageSent(id) {
  if (!db) db = initFirebase();
  if (!db) return;

  try {
    await db.collection('whatsapp_queue').doc(id).update({
      status: 'sent',
      sentAt: admin.firestore.Timestamp.now(),
    });
  } catch (err) {
    console.error(`Failed to mark queue message ${id} as sent:`, err.message);
  }
}

async function getLeadByPhone(phone) {
  if (!db) db = initFirebase();
  if (!db) return null;

  try {
    const clean = phone.replace(/\D/g, '');
    const snap = await db.collection('leads')
      .where('phone', '==', clean)
      .limit(1)
      .get();

    if (!snap.empty) {
      return snap.docs[0].data();
    }
    return null;
  } catch (err) {
    return null;
  }
}

const emailService = require('./email-service');

async function updateLeadQualification(phone, qualData, clientName = '') {
  if (!db) db = initFirebase();
  if (!db) return;

  try {
    const clean = phone.replace(/\D/g, '');
    let resolvedName = clientName;
    
    // Update matching lead in leads collection
    const snap = await db.collection('leads')
      .where('phone', '==', clean)
      .limit(1)
      .get();

    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      const data = snap.docs[0].data();
      resolvedName = resolvedName || qualData.client_name || data.name || data.clientName || 'Client';

      await docRef.update({
        qualification: qualData,
        qualifiedAt: admin.firestore.Timestamp.now(),
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
      });
      console.log(`🎯 [Lead Qualified in DB]: Updated qualification for phone ${clean}`);
    }

    // Also update stakeholders collection if present
    const stakeSnap = await db.collection('stakeholders')
      .where('phone', '==', clean)
      .limit(1)
      .get();

    if (!stakeSnap.empty) {
      const stakeData = stakeSnap.docs[0].data();
      resolvedName = resolvedName || qualData.client_name || stakeData.name || 'Client';

      await stakeSnap.docs[0].ref.update({
        stage: 'S3', // Advanced to Qualification Completed
        notes: `Qualified via WhatsApp: Viewing: ${qualData.preferred_viewing || 'TBD'}, Move-in: ${qualData.move_in_date || 'TBD'}, Budget: ${qualData.budget || 'TBD'} ${qualData.currency || 'EGP'}, Status: ${qualData.furnishing_status || 'Standard'}`,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    // ── 1. Real-Time Admin Dashboard Alert (Ring bell on localhost:3001) ──
    try {
      const locText = Array.isArray(qualData.locations) ? qualData.locations.join(', ') : (qualData.locations || 'New Cairo');
      await db.collection('notifications').add({
        type: 'lead',
        title: '🎯 Hot Lead Ready for Viewing!',
        titleAr: '🎯 عميل مؤهل جاهز للمعاينة!',
        message: `Client ${resolvedName || 'Client'} (+${clean}) is ready for viewing: ${qualData.preferred_viewing || 'Flexible'} (${locText})`,
        messageAr: `العميل ${resolvedName || 'العميل'} جاهز للمعاينة: ${qualData.preferred_viewing || 'مرن'} في ${locText}`,
        read: false,
        createdAt: admin.firestore.Timestamp.now(),
      });
      console.log('🔔 [Real-Time Admin Alert]: Notification dispatched to Admin Dashboard.');
    } catch (notifErr) {
      console.warn('⚠️ Could not insert notification:', notifErr.message);
    }

    // ── 2. Instant Email Dispatch to Admin & Sales Team ──
    try {
      await emailService.sendLeadQualificationAlert({
        phone: clean,
        name: resolvedName || 'Valued Client',
        qualData,
      });
    } catch (emailErr) {
      console.warn('⚠️ Email dispatch warning:', emailErr.message);
    }

  } catch (err) {
    console.error('Failed to update lead qualification in Firestore:', err.message);
  }
}

module.exports = {
  initFirebase,
  getPendingQueueMessages,
  markQueueMessageSent,
  getLeadByPhone,
  updateLeadQualification,
};

