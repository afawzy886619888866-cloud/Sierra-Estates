import { describe, it, expect } from 'vitest';

describe('Bots & Client Replying Communication Test Suite', () => {
  describe('Inbound Message Intent & Language Classification', () => {
    type IntentType = 'buy_inquiry' | 'rent_inquiry' | 'schedule_viewing' | 'price_check' | 'general';

    function classifyClientMessage(text: string): { intent: IntentType; language: 'ar' | 'en'; budgetDetected?: number } {
      const isArabic = /[\u0600-\u06FF]/.test(text);
      const lower = text.toLowerCase();

      let intent: IntentType = 'general';
      if (lower.includes('شراء') || lower.includes('buy') || lower.includes('للبيع')) {
        intent = 'buy_inquiry';
      } else if (lower.includes('ايجار') || lower.includes('rent') || lower.includes('للايجار')) {
        intent = 'rent_inquiry';
      } else if (lower.includes('معاينة') || lower.includes('viewing') || lower.includes('visit') || lower.includes('اشوف')) {
        intent = 'schedule_viewing';
      } else if (lower.includes('سعر') || lower.includes('price') || lower.includes('بكام') || lower.includes('كم')) {
        intent = 'price_check';
      }

      // Detect budget in millions / thousands
      let budgetDetected: number | undefined;
      const budgetMatch = text.match(/(\d+)\s*(مليون|m|million)/i);
      if (budgetMatch) {
        budgetDetected = parseInt(budgetMatch[1], 10) * 1_000_000;
      }

      return {
        intent,
        language: isArabic ? 'ar' : 'en',
        budgetDetected,
      };
    }

    it('should classify Arabic buyer inquiries and extract budget', () => {
      const msg = 'مساء الخير، مهتم بشراء فيلا مستقلة في ميفيدا التجمع بميزانية 35 مليون جنيه';
      const result = classifyClientMessage(msg);

      expect(result.language).toBe('ar');
      expect(result.intent).toBe('buy_inquiry');
      expect(result.budgetDetected).toBe(35_000_000);
    });

    it('should classify English viewing schedule requests', () => {
      const msg = 'Hi, I would like to schedule a viewing for the Hyde Park townhouse tomorrow.';
      const result = classifyClientMessage(msg);

      expect(result.language).toBe('en');
      expect(result.intent).toBe('schedule_viewing');
    });
  });

  describe('Automated Bilingual Response Generation', () => {
    function generateBotReply(
      clientName: string,
      intent: string,
      language: 'ar' | 'en',
      options: { compound?: string; priceRange?: string } = {}
    ): string {
      if (language === 'ar') {
        if (intent === 'buy_inquiry') {
          return `أهلاً بك أستاذ ${clientName}، يسعدنا تواصلك مع سييرا إستيتس. لدينا خيارات مميزة في ${options.compound || 'أرقى كمبوندات التجمع الخامس'} في حدود ${options.priceRange || 'ميزانيتك'}. هل يناسبك ترتيب موعد لمعاينة الوحدات المتاحة هذا الأسبوع؟`;
        }
        return `أهلاً بك أستاذ ${clientName} في سييرا إستيتس. كيف يمكن لمستشارك العقاري مساعدتك اليوم؟`;
      }

      // English
      if (intent === 'buy_inquiry') {
        return `Hello ${clientName}, welcome to Sierra Estates. We have curated premium listings in ${options.compound || 'New Cairo'} within ${options.priceRange || 'your budget'}. Would you like to schedule a private viewing this week?`;
      }
      return `Hello ${clientName}, welcome to Sierra Estates. How may our luxury property advisor assist you today?`;
    }

    it('should generate professional Arabic buyer response', () => {
      const reply = generateBotReply('كريم', 'buy_inquiry', 'ar', {
        compound: 'ميفيدا',
        priceRange: '35 - 40 مليون جنيه',
      });

      expect(reply).toContain('أهلاً بك أستاذ كريم');
      expect(reply).toContain('سييرا إستيتس');
      expect(reply).toContain('ميفيدا');
      expect(reply).toContain('معاينة الوحدات');
    });

    it('should generate luxury English concierge response', () => {
      const reply = generateBotReply('Tarek', 'buy_inquiry', 'en', {
        compound: 'Hyde Park',
        priceRange: '25 - 30M EGP',
      });

      expect(reply).toContain('Hello Tarek');
      expect(reply).toContain('Sierra Estates');
      expect(reply).toContain('Hyde Park');
      expect(reply).toContain('private viewing');
    });
  });
});
