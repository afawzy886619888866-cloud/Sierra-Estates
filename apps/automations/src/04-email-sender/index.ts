import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../lib/firebase';

/**
 * 04-email-sender
 *
 * Sends bulk matches and investor briefings.
 */

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export async function runEmailSender(campaignId: string) {
  console.log(`[Email Sender] Processing campaign: ${campaignId}`);
  
  try {
    const db = getDb('Email Sender');
    
    // 1. Fetch targeted investors from Matchmaker agent outputs (mocked)
    // Normally we'd query: db.collection('investors').where('matchedCampaign', '==', campaignId)
    const mockInvestors = [
      { email: 'investor1@example.com', name: 'VIP Investor 1' },
      { email: 'investor2@example.com', name: 'VIP Investor 2' }
    ];

    let sentCount = 0;

    // 2. Dispatch emails using Resend
    for (const investor of mockInvestors) {
      console.log(`[Email Sender] Sending briefing to ${investor.email}`);
      
      // In a real environment, uncomment to actually send:
      /*
      await resend.emails.send({
        from: 'Sierra Estates <investments@sierra-estates.com>',
        to: investor.email,
        subject: `Exclusive Investment Briefing - ${campaignId}`,
        html: `<p>Dear ${investor.name},</p><p>We have a new high-value property match for your portfolio.</p>`
      });
      */
      sentCount++;
      
      // Log to CRM
      await db.collection('communications').add({
        targetEmail: investor.email,
        direction: 'outbound',
        type: 'email',
        campaign: campaignId,
        status: 'sent',
        sentAt: FieldValue.serverTimestamp()
      });
    }
    
    return {
      success: true,
      emailsSent: sentCount,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('[Email Sender] Failed to send campaign:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Allow direct execution
if (require.main === module) {
  runEmailSender('investor-briefing-q3').then(console.log).catch(console.error);
}


