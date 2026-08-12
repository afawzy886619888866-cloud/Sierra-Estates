import { createSierraNotification } from '../firebase';
import { Listing } from '../types';

/**
 * Trigger automated WhatsApp message request to unit owner/broker for photos.
 */
export async function sendWhatsAppPhotoRequest(listing: Listing, targetPhone?: string): Promise<{ success: boolean; message: string }> {
  const phone = targetPhone || listing.ownerPhone || '+201000000000';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  const templateMsg = `Hello! Regarding your listing [${listing.code}] in ${listing.cmp} (${listing.type}, ${listing.beds} Beds): We noticed your listing currently has no images. Please reply with 4+ high-res photos to boost your AI Visibility Score to 95%+ on Sierra Estates!`;

  try {
    // 1. Log System Notification in Firestore
    await createSierraNotification(
      'listing',
      'WhatsApp Photo Request Sent',
      `Automated WhatsApp photo request sent to ${cleanPhone} for unit ${listing.code}.`,
      'تم إرسال طلب صور عبر واتساب',
      `تم إرسال طلب صور آلي إلى ${cleanPhone} للوحدة ${listing.code}.`
    );

    // 2. Open WhatsApp Web link for direct trigger or API dispatch
    const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(templateMsg)}`;
    window.open(waUrl, '_blank');

    return {
      success: true,
      message: `Photo request dispatched to ${cleanPhone}!`,
    };
  } catch (err: any) {
    console.error('Failed to send WhatsApp photo request:', err);
    return {
      success: false,
      message: err?.message || 'Failed to dispatch WhatsApp request.',
    };
  }
}
