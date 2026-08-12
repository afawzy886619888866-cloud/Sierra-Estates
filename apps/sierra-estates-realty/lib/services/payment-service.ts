/**
 * SIERRA BLU — PAYMENT SERVICE
 * Handles down payments, escrow holds, and transaction management.
 * Integration with Stripe for payment processing.
 */

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  investorId: string;
  propertyId: string;
  createdAt: string;
  expiresAt?: string;
}

export class PaymentService {
  private static STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY;
  private static STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  /**
   * Create a payment intent for a down payment or escrow hold.
   */
  static async createPaymentIntent(
    investorId: string,
    propertyId: string,
    amountInEGP: number,
    description: string
  ): Promise<PaymentIntent | null> {
    if (!this.STRIPE_API_KEY) {
      console.warn('[PaymentService] Stripe API key not configured. Payment processing disabled.');
      return null;
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.STRIPE_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: String(Math.round(amountInEGP * 100)),
          currency: 'egp',
          description: description,
          'metadata[investorId]': investorId,
          'metadata[propertyId]': propertyId,
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[PaymentService] Stripe error:', error);
        return null;
      }

      const intent = await response.json();
      console.log(`[PaymentService] Payment intent created: ${intent.id}`);

      return {
        id: intent.id,
        amount: amountInEGP,
        currency: 'EGP',
        status: intent.status === 'succeeded' ? 'completed' : 'pending',
        investorId,
        propertyId,
        createdAt: new Date(intent.created * 1000).toISOString(),
        expiresAt: intent.charges?.data[0]?.receipt_email ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error: any) {
      console.error('[PaymentService] Error creating payment intent:', error.message);
      return null;
    }
  }

  /**
   * Process a refund for a failed or cancelled transaction.
   */
  static async refundPayment(paymentIntentId: string): Promise<boolean> {
    if (!this.STRIPE_API_KEY) {
      console.warn('[PaymentService] Stripe API key not configured. Refund processing disabled.');
      return false;
    }

    try {
      const response = await fetch(
        `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.STRIPE_API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[PaymentService] Refund error:', error);
        return false;
      }

      console.log(`[PaymentService] Payment ${paymentIntentId} refunded`);
      return true;
    } catch (error: any) {
      console.error('[PaymentService] Error processing refund:', error.message);
      return false;
    }
  }

  /**
   * Verify webhook signature from Stripe.
   */
  static verifyWebhookSignature(
    rawBody: string,
    signature: string
  ): boolean {
    if (!this.STRIPE_WEBHOOK_SECRET) {
      console.warn('[PaymentService] Stripe webhook secret not configured. Webhooks cannot be verified.');
      return false;
    }

    try {
      const crypto = require('crypto');
      const timestamp = signature.split(',')[0].split('=')[1];
      const testSignature = signature.split(',')[1].split('=')[1];

      const signedContent = `${timestamp}.${rawBody}`;
      const hash = crypto
        .createHmac('sha256', this.STRIPE_WEBHOOK_SECRET)
        .update(signedContent)
        .digest('hex');

      return hash === testSignature;
    } catch (error) {
      console.error('[PaymentService] Webhook verification error:', error);
      return false;
    }
  }
}
