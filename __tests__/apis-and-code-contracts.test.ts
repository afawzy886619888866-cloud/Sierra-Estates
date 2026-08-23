import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('APIs & Code Contracts Test Suite', () => {
  describe('Zod Schema API Validation Contracts', () => {
    const LeadCreationSchema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
      email: z.string().email().optional(),
      targetCompound: z.string().min(1, 'Target compound is required'),
      budgetEgp: z.number().positive('Budget must be positive'),
      currency: z.enum(['EGP', 'USD', 'AED']).default('EGP'),
      notes: z.string().max(1000).optional(),
    });

    it('should validate valid lead creation payload', () => {
      const validPayload = {
        name: 'Karim Mansour',
        phone: '+201001234567',
        email: 'karim@example.com',
        targetCompound: 'Mivida',
        budgetEgp: 38000000,
        currency: 'EGP',
        notes: 'Looking for prompt cash closing',
      };

      const parsed = LeadCreationSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('Karim Mansour');
        expect(parsed.data.currency).toBe('EGP');
      }
    });

    it('should fail validation on malformed phone number or negative budget', () => {
      const invalidPayload = {
        name: 'A',
        phone: 'invalid-phone-string',
        targetCompound: 'Mivida',
        budgetEgp: -5000,
      };

      const parsed = LeadCreationSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errorMessages = parsed.error.issues.map((i) => i.message);
        expect(errorMessages).toContain('Name must be at least 2 characters');
        expect(errorMessages).toContain('Invalid phone number format');
        expect(errorMessages).toContain('Budget must be positive');
      }
    });
  });

  describe('Calculator API Response Serialization Contract', () => {
    interface InstallmentCalculationResponse {
      propertyPrice: number;
      downPayment: number;
      downPaymentPercent: number;
      durationYears: number;
      totalQuarters: number;
      quarterlyPayment: number;
      currency: string;
    }

    function serializeCalculatorResponse(
      price: number,
      downPaymentPercent: number,
      years: number,
      currency = 'EGP'
    ): InstallmentCalculationResponse {
      const downPayment = (price * downPaymentPercent) / 100;
      const balance = price - downPayment;
      const quarters = years * 4;
      const quarterlyPayment = Math.round(balance / quarters);

      return {
        propertyPrice: price,
        downPayment,
        downPaymentPercent,
        durationYears: years,
        totalQuarters: quarters,
        quarterlyPayment,
        currency,
      };
    }

    it('should serialize accurate calculator payload response', () => {
      const res = serializeCalculatorResponse(30_000_000, 10, 8, 'EGP');

      expect(res.propertyPrice).toBe(30_000_000);
      expect(res.downPayment).toBe(3_000_000);
      expect(res.totalQuarters).toBe(32);
      expect(res.quarterlyPayment).toBe(843750); // (27M / 32)
      expect(res.currency).toBe('EGP');
    });
  });
});
