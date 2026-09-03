import { POST } from '@/app/api/listings/easy-parse/route';

describe('Easy Listing AI Parser API Endpoint', () => {
  it('parses unstructured raw Arabic listing text with compound, price, beds, and SBR code', async () => {
    const rawText = `للبيع شقة مميزة جدا في ميفيدا التجمع الخامس
مساحة 185م + فيو بحيرات مباشرة
3 غرف نوم + 2 حمام + ريسبشن كبير
تشطيب الترا سوبر لوكس
السعر المطلوب: 14,500,000 ج
للتواصل والمعاينة: 01001234567`;

    const req = new Request('http://localhost:3000/api/listings/easy-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText,
        source: 'whatsapp',
        images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9'],
      }),
    });

    const res = await POST(req );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.compound).toBe('Mivida');
    expect(json.data.propertyType).toBe('Apartment');
    expect(json.data.price).toBe(14500000);
    expect(json.data.beds).toBe(3);
    expect(json.data.baths).toBe(2);
    expect(json.data.area).toBe(185);
    expect(json.data.sierraCode).toBeDefined();
    expect(json.images).toHaveLength(1);
  });

  it('rejects invalid payload with short text', async () => {
    const req = new Request('http://localhost:3000/api/listings/easy-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: 'hi',
      }),
    });

    const res = await POST(req );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Validation failed');
  });
});
