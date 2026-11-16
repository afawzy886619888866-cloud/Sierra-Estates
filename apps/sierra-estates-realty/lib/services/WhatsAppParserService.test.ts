import { WhatsAppParserService } from './WhatsAppParserService';

describe('WhatsAppParserService.formatWhatsAppMessage', () => {
  const originalEnv = process.env;
  beforeAll(() => {
    process.env = { ...originalEnv, BRANDING_TAG: 'Sierra Estates | Excellence in Living.' };
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  it('should include the brand header and property details', () => {
    const data = { compound: 'Mivida Villa', price: 2500000, bedrooms: 3 };
    const message = WhatsAppParserService.formatWhatsAppMessage(data);
    expect(message).toContain('*BEYOND BROKERAGE.*');
    expect(message).toContain('*Sierra Estates | Excellence in Living.*');
    expect(message).toContain('*Mivida Villa*');
    expect(message).toContain('Price: 2500000 EGP');
    expect(message).toContain('Bedrooms: 3');
  });
});
