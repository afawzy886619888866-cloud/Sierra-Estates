import { describe, it, expect } from 'vitest';
import { leadCreateSchema as leadSchema } from '../apps/sierra-estates-realty/lib/server/schemas';
import { InstallmentCalculator } from '../packages/agents-core/src/installment-calculator';

describe('APIs & Code Contracts Test Suite', () => {
  describe('Lead Creation API Validation Contract', () => {
    it('should validate a valid lead payload', () => {
      const validPayload = {
        name: 'Karim Mansour',
        phone: '+201001234567',
        email: 'karim@example.com',
        message: 'Looking for prompt cash closing',
        locale: 'en',
      };

      const parsed = leadSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('Karim Mansour');
      }
    });

    it('should fail validation on missing name or malformed email', () => {
      const invalidPayload = {
        name: '',
        email: 'not-an-email',
      };

      const parsed = leadSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errorMessages = parsed.error.issues.map((i: any) => i.message);
        expect(errorMessages).toContain('Name is required');
        expect(errorMessages).toContain('Invalid email address');
      }
    });
  });

  describe('Installment Calculator Contract', () => {
    it('should calculate an accurate quarterly amortization schedule', () => {
      const result = InstallmentCalculator.calculateSchedule({
        totalPrice: 30_000_000,
        downPaymentPercent: 10,
        tenureYears: 8,
        installmentsFrequency: 'quarterly',
      });

      expect(result.downPayment).toBe(3_000_000);
      expect(result.totalInstallments).toBe(32);
      expect(result.installmentAmount).toBe(843750); // (27M / 32)
      expect(result.schedule.length).toBe(33); // down payment + 32 installments
      expect(result.schedule.at(-1)?.remainingBalance).toBe(0);
    });
  });
});
