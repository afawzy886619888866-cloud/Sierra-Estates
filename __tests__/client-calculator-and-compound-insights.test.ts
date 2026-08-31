import { describe, it, expect } from 'vitest';

describe('Client Property Calculator & Admin WhatsApp Template Testing', () => {
  describe('Mortgage & Yield Analyzer Math', () => {
    it('calculates down payment, monthly payment, and net carry correctly', () => {
      const baseEGP = 10_000_000;
      const downPct = 30;
      const durationYears = 7;
      const annualInterest = 0.12;
      const estRentalYieldPct = 0.085;

      const downPayment = (baseEGP * downPct) / 100;
      const financedAmount = baseEGP - downPayment;
      const monthlyMortgage = Math.round((financedAmount * (1 + annualInterest * durationYears)) / (durationYears * 12));
      const estMonthlyRent = Math.round((baseEGP * estRentalYieldPct) / 12);
      const netMonthlyCarry = monthlyMortgage - estMonthlyRent;

      expect(downPayment).toBe(3_000_000);
      expect(financedAmount).toBe(7_000_000);
      expect(monthlyMortgage).toBe(153333);
      expect(estMonthlyRent).toBe(70833);
      expect(netMonthlyCarry).toBe(82500);
    });
  });

  describe('WhatsApp Template Variable Interpolation', () => {
    function interpolateWhatsAppTemplate(
      template: string,
      variables: { name?: string; compound?: string; price?: string }
    ): string {
      return template
        .replace(/\{\{name\}\}/g, variables.name || 'Client')
        .replace(/\{\{compound\}\}/g, variables.compound || 'New Cairo')
        .replace(/\{\{price\}\}/g, variables.price || 'Market Price');
    }

    it('interpolates all dynamic variables correctly', () => {
      const template = 'Dear {{name}}, exclusive luxury villa in {{compound}} available at {{price}}.';
      const output = interpolateWhatsAppTemplate(template, {
        name: 'Ahmed Al-Rashid',
        compound: 'Hyde Park',
        price: '18,500,000 EGP',
      });

      expect(output).toBe('Dear Ahmed Al-Rashid, exclusive luxury villa in Hyde Park available at 18,500,000 EGP.');
    });

    it('provides graceful fallbacks for missing template parameters', () => {
      const template = 'Hello {{name}}, welcome to {{compound}}!';
      const output = interpolateWhatsAppTemplate(template, {});
      expect(output).toBe('Hello Client, welcome to New Cairo!');
    });
  });

  describe('Compound Analytics Growth Bar Calculation', () => {
    it('normalizes price per sqm to width percentages accurately', () => {
      function calculateBarWidth(pricePerSqmStr: string, maxBenchmark = 120000): number {
        const numPrice = parseInt(pricePerSqmStr.replace(/[^0-9]/g, ''), 10) || 60000;
        return Math.min(100, Math.round((numPrice / maxBenchmark) * 100));
      }

      expect(calculateBarWidth('EGP 60,000 / m²')).toBe(50);
      expect(calculateBarWidth('EGP 120,000 / m²')).toBe(100);
      expect(calculateBarWidth('EGP 150,000 / m²')).toBe(100); // Capped at 100%
      expect(calculateBarWidth('EGP 30,000 / m²')).toBe(25);
    });
  });
});
