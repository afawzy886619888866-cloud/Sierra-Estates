/**
 * Automated Viewing Reminders & Confirmation Service
 * Scans Firestore viewing_appointments and dispatches WhatsApp pre-viewing reminders.
 */

const { adminDb } = require('./firebase-service');

class ViewingReminderService {
  constructor(whatsappClient) {
    this.client = whatsappClient;
    this.timer = null;
  }

  start(intervalMs = 60 * 60 * 1000) { // Check hourly
    this.checkUpcomingViewings();
    this.timer = setInterval(() => this.checkUpcomingViewings(), intervalMs);
    console.log('⏰ [ReminderService] Viewing reminder scheduler active (checking every hour).');
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async checkUpcomingViewings() {
    if (!adminDb || !this.client) return;

    try {
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const snapshot = await adminDb.collection('viewing_appointments')
        .where('status', '==', 'Scheduled')
        .get();

      if (snapshot.empty) return;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.reminderSent) continue;

        const phone = data.clientPhone;
        const name = data.clientName || 'عزيزنا العميل';
        const loc = data.location || 'التجمع الخامس';
        const viewingTime = data.preferred_viewing || 'اليوم';

        const reminderMsg = 
          `👋 أهلاً بحضرتك أستاذ ${name}،\n\n` +
          `🏡 تذكير لطيف بموعد معاينتنا الخاصة لوحدة كمبوند *${loc}* المحدد في: *${viewingTime}*.\n\n` +
          `مستشارنا العقاري سيكون في انتظاركم. يرجى الرد بـ:\n` +
          `• *1* أو *تأكيد* لتأكيد الموعد 🟢\n` +
          `• *2* أو *تعديل* لاختيار موعد بديل 🔄\n\n` +
          `_سييرا إستيتس — مستشارك العقاري الموثوق._`;

        const chatId = phone.includes('@') ? phone : `${phone}@c.us`;

        try {
          await this.client.sendMessage(chatId, reminderMsg);
          await doc.ref.update({
            reminderSent: true,
            reminderSentAt: new Date().toISOString(),
          });
          console.log(`📤 [ReminderService] Dispatched viewing reminder to ${phone}`);
        } catch (sendErr) {
          console.warn(`⚠️ [ReminderService] Failed to send reminder to ${phone}:`, sendErr.message);
        }
      }
    } catch (err) {
      console.error('❌ [ReminderService] Check error:', err.message);
    }
  }

  /**
   * Handles confirmation or reschedule reply from client
   */
  async handleClientConfirmation(phone, messageBody) {
    if (!adminDb) return null;

    const lower = messageBody.trim().toLowerCase();
    const isConfirm = lower === '1' || lower.includes('تأكيد') || lower.includes('تاكيد') || lower.includes('confirm');
    const isReschedule = lower === '2' || lower.includes('تعديل') || lower.includes('تاجيل') || lower.includes('تأجيل') || lower.includes('reschedule');

    if (!isConfirm && !isReschedule) return null;

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const snapshot = await adminDb.collection('viewing_appointments')
        .where('clientPhone', '==', cleanPhone)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const newStatus = isConfirm ? 'Confirmed' : 'Reschedule Requested';
      await doc.ref.update({
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
      });

      if (isConfirm) {
        return `✅ تم تأكيد موعد المعاينة بنجاح! مستشارنا العقاري في انتظاركم في الميعاد المحدد. نتمنى لكم جولة موفقة.`;
      } else {
        return `🔄 تم استلام طلب تعديل الموعد. ما هو اليوم والوقت الأنسب لحضرتك لنقوم بإعادة التنسيق فوراً؟`;
      }
    } catch (err) {
      console.error('❌ [ReminderService] Confirmation error:', err.message);
      return null;
    }
  }
}

module.exports = ViewingReminderService;
