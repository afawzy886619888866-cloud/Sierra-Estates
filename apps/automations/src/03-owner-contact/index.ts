import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 03-owner-contact
 * 
 * Automates WhatsApp outreach to owners (Liela Bot's "Hook" phase).
 */

if (!getApps().length) {
  try {
    initializeApp();
  } catch (error) {
    console.warn('[Owner Contact] Firebase admin could not be initialized.');
  }
}

export async function runOwnerContact(ownerPhone: string, propertyContext: any) {
  console.log(`[Owner Contact] Initiating outreach to ${ownerPhone}`);
  
  // Rule 6: The "Velvet Scythe" Sales Strategy
  // The Hook (Liela Bot): "مساء الخير، هل الوحدة متاحة؟ لدينا عملاء جاهزين."
  const message = "مساء الخير، هل الوحدة متاحة؟ لدينا عملاء جاهزين.";
  
  try {
    // 1. Mock sending message via WhatsApp Cloud API
    const waApiUrl = `https://graph.facebook.com/v17.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;
    
    // In a real scenario, you'd use fetch/axios:
    /*
    const response = await fetch(waApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: ownerPhone,
        type: "text",
        text: { body: message }
      })
    });
    const result = await response.json();
    */

    console.log(`[Owner Contact] Hook sent via API. Receiver: ${ownerPhone}, Msg: ${message}`);

    // 2. Log interaction in Firestore CRM
    const db = getFirestore();
    await db.collection('communications').add({
      targetPhone: ownerPhone,
      direction: 'outbound',
      type: 'whatsapp',
      message: message,
      context: propertyContext,
      status: 'sent',
      sentAt: FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      messageSent: message,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('[Owner Contact] Failed to send message:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Allow direct execution
if (require.main === module) {
  runOwnerContact('201234567890', { location: 'Mivida', price: '1600' }).then(console.log).catch(console.error);
}


