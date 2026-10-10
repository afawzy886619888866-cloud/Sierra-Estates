import { PaymentService } from '../lib/services/payment-service';

describe('Phase 7: Down-Payment Reservation Flow & Feature Gate (04 §B3)', () => {
  afterEach(() => {
    PaymentService.setReservationsEnabledOverride(null);
  });

  it('enforces DEFAULT-OFF feature flag gating on reservations', async () => {
    PaymentService.setReservationsEnabledOverride(null);

    // Default must be false
    expect(PaymentService.isReservationsEnabled()).toBe(false);

    const result = await PaymentService.createReservationCheckout({
      unitId: 'unit-miv-101',
      investorId: 'inv-456',
      amountInEGP: 100000,
    });

    expect(result.enabled).toBe(false);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ENABLE_UNIT_RESERVATIONS=false');
    expect(result.error).toContain('docs/RESERVATION_FLOW_LEGAL_CHECKLIST.md');
  });

  it('creates valid checkout session when feature flag is explicitly enabled', async () => {
    PaymentService.setReservationsEnabledOverride(true);
    expect(PaymentService.isReservationsEnabled()).toBe(true);

    const result = await PaymentService.createReservationCheckout({
      unitId: 'unit-miv-101',
      investorId: 'inv-456',
      investorEmail: 'client@example.com',
      amountInEGP: 150000,
    });

    expect(result.enabled).toBe(true);
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.checkoutUrl).toContain(result.sessionId!);
    expect(result.amountInEGP).toBe(150000);
    expect(result.currency).toBe('EGP');
    expect(result.expiresAt).toBeDefined();

    // Verify 14-day reservation window
    const expiresDate = new Date(result.expiresAt!).getTime();
    const now = Date.now();
    const daysDiff = Math.round((expiresDate - now) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(14);
  });

  it('confirms reservation hold and generates 14-day lock timestamp', async () => {
    PaymentService.setReservationsEnabledOverride(true);

    const confirmed = await PaymentService.confirmUnitReservation({
      unitId: 'unit-miv-101',
      paymentIntentId: 'pi_test_123456789',
      amountInEGP: 150000,
      investorId: 'inv-456',
    });

    expect(confirmed.success).toBe(true);
    expect(confirmed.reservedUntil).toBeDefined();
    expect(new Date(confirmed.reservedUntil).getTime()).toBeGreaterThan(Date.now());
  });
});
