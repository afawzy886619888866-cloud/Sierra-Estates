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

    const res = await POST(req as any);
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
<<<<<<< HEAD
=======
    expect(json.data.mobile).toBe('01001234567');
    expect(json.data.mode).toBe('sale');
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    expect(json.data.sierraCode).toBeDefined();
    expect(json.images).toHaveLength(1);
  });

<<<<<<< HEAD
=======
  it('returns null for every field the text does not state — no fabricated defaults', async () => {
    // §21: text with NO compound, NO price, NO phone, NO type. The old
    // heuristic defaulted '5th Settlement' / 'Apartment' / beds 3 / baths 2 /
    // area 180 / price 10M / placeholder phone / 'Direct Client Intake'
    // owner / hardcoded aiScore 9.4 — all of that must stay null now.
    const req = new Request('http://localhost:3000/api/listings/easy-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: 'my neighbour is moving out soon, ask him about the place',
        source: 'manual',
      }),
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    const data = json.data;
    expect(data.compound).toBeNull();
    expect(data.propertyType).toBeNull();
    expect(data.mode).toBeNull();
    expect(data.beds).toBeNull();
    expect(data.baths).toBeNull();
    expect(data.area).toBeNull();
    expect(data.price).toBeNull();
    expect(data.mobile).toBeNull();
    expect(data.ownerName).toBeNull();
    expect(data.aiScore).toBeNull();
    expect(data.sierraCode).toBeNull();
    // Nothing fabricated may appear anywhere in the payload.
    const flat = JSON.stringify(json);
    expect(flat).not.toContain('New Cairo');
    expect(flat).not.toContain('5th Settlement');
    expect(flat).not.toContain('10000000');
    expect(flat).not.toContain('8000000');
    expect(flat).not.toContain('201092048333');
    expect(flat).not.toContain('Direct Client Intake');
    expect(flat).not.toContain('Sierra Verified Portfolio');
    // Honest completeness: zero key fields found → confidence 0.
    expect(data.confidence).toBe(0);
    expect(json.missing).toContain('compound');
    expect(json.missing).toContain('price');
    expect(json.missing).toContain('mobile');
  });

>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  it('rejects invalid payload with short text', async () => {
    const req = new Request('http://localhost:3000/api/listings/easy-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: 'hi',
      }),
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Validation failed');
  });
});
