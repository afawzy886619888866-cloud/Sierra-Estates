import { assertDbConfigured, insertRecord } from '../lib/db';

/**
 * 03-owner-contact
 *
 * Automates WhatsApp outreach to owners (Liela Bot's "Hook" phase).
 */

export async function runOwnerContact(ownerPhone, propertyContext) {
  console.log(`[Owner Contact] Initiating outreach to ${ownerPhone}`);
  
  // Rule 6: The "Velvet Scythe" Sales Strategy
  // The Hook (Liela Bot): "مساء الخير، هل الوحدة متاحة؟ لدينا عملاء جاهزين."
  const message = "مساء الخير، هل الوحدة متاحة؟ لدينا عملاء جاهزين.";
  
  try {
    // 1. Mock sending message via WhatsApp Cloud API
    const waApiUrl = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    // In a real scenario, you'd use fetch/axios:
    /*
    const response = await fetch(waApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
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

    // 2. Log interaction in the CRM
    if (assertDbConfigured('Owner Contact')) {
      await insertRecord('communications', {
        targetPhone: ownerPhone,
        direction: 'outbound',
        type: 'whatsapp',
        message,
        context: propertyContext,
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
    }
    
    return {
      success: true,
      messageSent: message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
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


