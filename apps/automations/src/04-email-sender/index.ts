import { Resend } from 'resend';
import { assertDbConfigured, insertRecord } from '../lib/db';

/**
 * 04-email-sender — campaign email dispatch (REAL-PROVIDER-ONLY).
 *
 * MOCK PATH REMOVED (2026-10-25): the previous revision iterated a
 * hard-coded `mockInvestors` list (investor1@example.com …), kept the real
 * resend.emails.send() call commented out, incremented sentCount anyway and
 * wrote `communications` rows with status 'sent' — fabricated delivery
 * records. It also defaulted the Resend client to the literal key
 * 're_mock_key', so an unconfigured environment still "sent" successfully.
 *
 * The honest contract now:
 *   1. No recipients are invented. Recipients must be supplied by the
 *      caller (campaign audience resolution is the caller's job); an empty
 *      audience is reported as { status: 'no_recipients' }, never faked.
 *   2. No 're_mock_key' default — a missing RESEND_API_KEY disables the
 *      module ({ status: 'provider_unconfigured' }) and nothing is written.
 *   3. A communication is marked 'sent' ONLY after Resend accepts the
 *      message (API 2xx / no error). Anything else is 'failed' — and the
 *      failure is recorded as a failure, never as a success.
 */

export interface CampaignRecipient {
  email: string;
  name?: string;
}

export type EmailSenderStatus =
  | 'ok'
  | 'provider_unconfigured'
  | 'no_recipients'
  | 'db_unconfigured'
  | 'partial'
  | 'failed';

export interface EmailSenderResult {
  success: boolean;
  status: EmailSenderStatus;
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
  timestamp: string;
}

export async function runEmailSender(
  campaignId: string,
  recipients: CampaignRecipient[] = [],
): Promise<EmailSenderResult> {
  const timestamp = new Date().toISOString();
  const result: EmailSenderResult = {
    success: false, status: 'failed', emailsSent: 0, emailsFailed: 0, errors: [], timestamp,
  };

  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) {
    // The 're_mock_key' default is gone: unconfigured means disabled.
    result.status = 'provider_unconfigured';
    result.errors.push('RESEND_API_KEY missing — email dispatch disabled');
    return result;
  }

  const audience = (recipients || []).filter((r) => r && typeof r.email === 'string' && r.email.includes('@'));
  if (!audience.length) {
    // An empty audience is a fact to report, not a list to invent.
    result.status = 'no_recipients';
    result.errors.push('no valid recipients supplied for this campaign');
    return result;
  }

  const resend = new Resend(apiKey);
  const dbReady = assertDbConfigured('Email Sender');

  for (const recipient of audience) {
    try {
      const { error } = await resend.emails.send({
        from: 'Sierra Estates <investments@sierra-estates.com>',
        to: recipient.email,
        subject: `Exclusive Investment Briefing - ${campaignId}`,
        html: `<p>Dear ${recipient.name || 'Investor'},</p><p>We have a new high-value property match for your portfolio.</p>`,
      });

      if (error) {
        // Provider rejection — recorded as a failure, never as sent.
        result.emailsFailed++;
        result.errors.push(`${recipient.email}: ${error.message || String(error)}`);
        continue;
      }

      result.emailsSent++;
      if (dbReady) {
        await insertRecord('communications', {
          targetEmail: recipient.email,
          direction: 'outbound',
          type: 'email',
          campaignId,
          status: 'sent', // only after provider acceptance
          sentAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      result.emailsFailed++;
      result.errors.push(`${recipient.email}: ${error?.message ?? String(error)}`);
    }
  }

  result.status =
    result.emailsFailed === 0 ? 'ok' : result.emailsSent > 0 ? 'partial' : 'failed';
  result.success = result.status === 'ok';
  return result;
}

// Allow direct execution — honest smoke: unconfigured must refuse.
if (require.main === module) {
  runEmailSender('investor-briefing-q3').then((res) => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 2);
  });
}
