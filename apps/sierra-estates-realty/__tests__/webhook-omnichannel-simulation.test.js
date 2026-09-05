import { isValidTwilioSignature } from '../lib/server/twilio-client';
import { FxGoldValuationEngine } from '../../../packages/agents-core/src/fx-gold-engine';
import { NegotiationEngine } from '../../../packages/agents-core/src/negotiation-engine';
import crypto from 'crypto';

describe('Webhook & Omnichannel Intelligence Live Simulation', () => {
  const authToken = 'mock_twilio_auth_token_for_testing_12345';
  const url = 'https://sierra-estates.net/api/webhooks/whatsapp';
  const params = {
    From: 'whatsapp:+201001234567',
    To: 'whatsapp:+201032206443',
    Body: 'Interested in buying 4-bedroom villa in Hyde Park Cairo under 35M EGP',
    MessageSid: 'SM_test_msg_98765',
  };

  it('validates Twilio HMAC-SHA1 signature correctly', () => {
    // Generate valid Twilio signature: URL + sorted key-value pairs hashed with HMAC-SHA1
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + params[key];
    }
    const validSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    const isValid = isValidTwilioSignature(validSignature, url, params, authToken);
    expect(isValid).toBe(true);

    const isInvalid = isValidTwilioSignature('invalid_sig_abc', url, params, authToken);
    expect(isInvalid).toBe(false);
  });

  it('correctly parses and computes FX & Gold parity for lead property values', () => {
    const propertyPriceEGP = 35000000;
    const parity = FxGoldValuationEngine.calculateParity(propertyPriceEGP);

    expect(parity.usdEquivalent).toBeGreaterThan(700000);
    expect(parity.aedEquivalent).toBeGreaterThan(2500000);
    expect(parity.gold21kGramsEquivalent).toBeGreaterThan(8000);
    expect(parity.formattedDisplay.gold21k).toContain('kg');
  });

  it('simulates owner counter-offer negotiation loop', () => {
    const askingPrice = 35000000;
    const buyerOffer = 31000000; // ~11.4% discount request
    const sellerFloor = 32500000;

    const outcome = NegotiationEngine.simulateNegotiation(askingPrice, buyerOffer, sellerFloor);

    expect(outcome.status).toBe('agreement_reached');
    expect(outcome.finalPrice).toBeDefined();
    expect(outcome.finalPrice).toBeGreaterThanOrEqual(sellerFloor);
    expect(outcome.rounds.length).toBeGreaterThanOrEqual(2);
    expect(outcome.commissionFeeEGP).toBe(Math.round((outcome.finalPrice || 0) * 0.025));
  });
});
