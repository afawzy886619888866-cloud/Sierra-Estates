 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA BLU — PAYMENT SERVICE
 * Handles down payments, escrow holds, and transaction management.
 * Integration with Stripe for payment processing.
 */












export class PaymentService {
   static __initStatic() {this.STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY}
   static __initStatic2() {this.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET}

  /**
   * Create a payment intent for a down payment or escrow hold.
   */
  static async createPaymentIntent(
    investorId,
    propertyId,
    amountInEGP,
    description
  ) {
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
        expiresAt: _optionalChain([intent, 'access', _ => _.charges, 'optionalAccess', _2 => _2.data, 'access', _3 => _3[0], 'optionalAccess', _4 => _4.receipt_email]) ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      console.error('[PaymentService] Error creating payment intent:', error.message);
      return null;
    }
  }

  /**
   * Process a refund for a failed or cancelled transaction.
   */
  static async refundPayment(paymentIntentId) {
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
    } catch (error) {
      console.error('[PaymentService] Error processing refund:', error.message);
      return false;
    }
  }

  /**
   * Verify webhook signature from Stripe.
   */
  static verifyWebhookSignature(
    rawBody,
    signature
  ) {
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
} PaymentService.__initStatic(); PaymentService.__initStatic2();
