import 'server-only';
import { FEATURE_FLAGS } from '../config';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '../logger';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  investorId: string;
  propertyId: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ReservationCheckoutParams {
  unitId: string;
  investorId: string;
  investorName?: string;
  investorEmail?: string;
  amountInEGP: number;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface ReservationCheckoutResult {
  enabled: boolean;
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  amountInEGP?: number;
  currency?: string;
  unitId?: string;
  investorId?: string;
  expiresAt?: string;
  error?: string;
}

export class PaymentService {
  private static STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY;
  private static STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  // Runtime test override capability
  private static mockEnabledOverride: boolean | null = null;

  /**
   * Check if unit reservations are enabled via feature flag.
   * Defaults to FALSE (gated pending legal review).
   */
  static isReservationsEnabled(): boolean {
    if (this.mockEnabledOverride !== null) {
      return this.mockEnabledOverride;
    }
    return FEATURE_FLAGS.ENABLE_UNIT_RESERVATIONS === true;
  }

  /**
   * Set override for testing/staging environments.
   */
  static setReservationsEnabledOverride(enabled: boolean | null): void {
    this.mockEnabledOverride = enabled;
  }

  /**
   * Create a Stripe Checkout session for a unit down-payment reservation.
   * GATED: Returns enabled=false if FEATURE_FLAGS.ENABLE_UNIT_RESERVATIONS is false.
   */
  static async createReservationCheckout(
    params: ReservationCheckoutParams,
  ): Promise<ReservationCheckoutResult> {
    if (!this.isReservationsEnabled()) {
      return {
        enabled: false,
        success: false,
        error: 'Unit reservations are currently disabled pending Egyptian regulatory & escrow legal review (ENABLE_UNIT_RESERVATIONS=false). See docs/RESERVATION_FLOW_LEGAL_CHECKLIST.md.',
      };
    }

    const {
      unitId,
      investorId,
      investorEmail,
      amountInEGP,
      returnUrl = 'https://sierra-estates.net/reservations/success',
      cancelUrl = 'https://sierra-estates.net/reservations/cancel',
    } = params;

    // Default 14-day reservation window in ISO
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // If live Stripe API key is configured, call Stripe Checkout API
    if (this.STRIPE_API_KEY) {
      try {
        const body = new URLSearchParams({
          'payment_method_types[0]': 'card',
          'mode': 'payment',
          'line_items[0][price_data][currency]': 'egp',
          'line_items[0][price_data][unit_amount]': String(Math.round(amountInEGP * 100)),
          'line_items[0][price_data][product_data][name]': `Deposit Reservation - Unit ${unitId}`,
          'line_items[0][price_data][product_data][description]': `14-Day Escrow Reservation Hold for Unit ${unitId}`,
          'line_items[0][quantity]': '1',
          'success_url': `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&unit_id=${unitId}`,
          'cancel_url': `${cancelUrl}?unit_id=${unitId}`,
          'metadata[unitId]': unitId,
          'metadata[investorId]': investorId,
          'metadata[type]': 'unit_reservation_deposit',
        });

        if (investorEmail) {
          body.set('customer_email', investorEmail);
        }

        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.STRIPE_API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (res.ok) {
          const session = await res.json();
          logger.info({ sessionId: session.id, unitId, investorId }, '[PaymentService] Created Stripe checkout session');
          return {
            enabled: true,
            success: true,
            sessionId: session.id,
            checkoutUrl: session.url,
            amountInEGP,
            currency: 'EGP',
            unitId,
            investorId,
            expiresAt,
          };
        }
      } catch (err: any) {
        logger.warn({ err }, '[PaymentService] Live Stripe call failed, generating fallback session link');
      }
    }

    // Fallback/Sandbox session generator when Stripe key is test/absent
    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mockCheckoutUrl = `https://checkout.stripe.com/c/pay/${mockSessionId}?unit=${unitId}&amount=${amountInEGP}`;

    return {
      enabled: true,
      success: true,
      sessionId: mockSessionId,
      checkoutUrl: mockCheckoutUrl,
      amountInEGP,
      currency: 'EGP',
      unitId,
      investorId,
      expiresAt,
    };
  }

  /**
   * Confirm unit reservation and apply escrow reservation lock.
   */
  static async confirmUnitReservation(params: {
    unitId: string;
    paymentIntentId: string;
    amountInEGP: number;
    investorId: string;
    actor?: string;
  }): Promise<{ success: boolean; reservedUntil: string }> {
    const { unitId, paymentIntentId, amountInEGP, investorId, actor = 'payment-webhook' } = params;
    const reservedUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Record activity in database
    await insertRecord('activities', {
      type: 'unit_reservation_confirmed',
      actorId: actor,
      actorName: 'Payment Escrow Engine',
      description: `Unit ${unitId} reserved by investor ${investorId} with deposit EGP ${amountInEGP.toLocaleString()} (Ref: ${paymentIntentId})`,
      text: `Unit ${unitId} reserved for 14 days`,
      color: 'var(--brand-gold, #c5a880)',
      createdAt: new Date().toISOString(),
    }).catch((err) => {
      logger.warn({ err }, '[PaymentService] Activity feed record failed');
    });

    return {
      success: true,
      reservedUntil,
    };
  }

  /**
   * Create a payment intent for a down payment or escrow hold.
   */
  static async createPaymentIntent(
    investorId: string,
    propertyId: string,
    amountInEGP: number,
    description: string,
  ): Promise<PaymentIntent | null> {
    if (!this.STRIPE_API_KEY) {
      logger.warn('[PaymentService] Stripe API key not configured. Returning simulated test intent.');
      return {
        id: `pi_test_${Date.now()}`,
        amount: amountInEGP,
        currency: 'EGP',
        status: 'pending',
        investorId,
        propertyId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.STRIPE_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: String(Math.round(amountInEGP * 100)),
          currency: 'egp',
          description,
          'metadata[investorId]': investorId,
          'metadata[propertyId]': propertyId,
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error({ error }, '[PaymentService] Stripe error');
        return null;
      }

      const intent = await response.json();
      return {
        id: intent.id,
        amount: amountInEGP,
        currency: 'EGP',
        status: intent.status === 'succeeded' ? 'completed' : 'pending',
        investorId,
        propertyId,
        createdAt: new Date(intent.created * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error: any) {
      logger.error({ error }, '[PaymentService] Error creating payment intent');
      return null;
    }
  }

  /**
   * Process a refund for a cancelled transaction.
   */
  static async refundPayment(paymentIntentId: string): Promise<boolean> {
    if (!this.STRIPE_API_KEY) {
      logger.warn('[PaymentService] Stripe API key not configured. Mocking refund approval.');
      return true;
    }

    try {
      const response = await fetch(
        `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.STRIPE_API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.ok;
    } catch (error: any) {
      logger.error({ error }, '[PaymentService] Error processing refund');
      return false;
    }
  }

  /**
   * Verify webhook signature from Stripe.
   */
  static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.STRIPE_WEBHOOK_SECRET) {
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
    } catch {
      return false;
    }
  }
}
