import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const inbox = require('../lib/inbox.js');

describe('workflows/lib/inbox.js — WhatsApp <-> Sheet <-> Client Map parity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WF_SHEET_WRITE_URL;
    delete process.env.WF_SHEET_WRITE_SECRET;
  });

  it('classifies Arabic and English owner replies accurately', () => {
    expect(inbox.classifyOwnerReply('إلغاء')).toBe('opt_out');
    expect(inbox.classifyOwnerReply('الوحدة غير متاحة حاليا')).toBe('unavailable');
    expect(inbox.classifyOwnerReply('تم البيع الحمد لله')).toBe('unavailable');
    expect(inbox.classifyOwnerReply('نعم متاحة للمعاينة')).toBe('available');
    expect(inbox.classifyOwnerReply('السعر النهائي ١٢ مليون كاش')).toBe('negotiation');
  });

  it('normalizes Egyptian mobile formats to E.164', () => {
    expect(inbox.normalizeOwnerPhone('201061399688@c.us')).toBe('+201061399688');
    expect(inbox.normalizeOwnerPhone('01032206443')).toBe('+201032206443');
    expect(inbox.normalizeOwnerPhone('٠١٠٩٢٠٤٨٣٣٣')).toBe('+201092048333');
  });

  it('writes owner reply availability and Cairo date back to WF_SHEET_WRITE_URL', async () => {
    process.env.WF_SHEET_WRITE_URL = 'https://script.google.com/macros/s/mock/exec';
    process.env.WF_SHEET_WRITE_SECRET = 'mock-secret';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, updated: 1 }), { status: 200 }),
    );

    const ok = await inbox.writeOwnerReplyToSheet('+201061399688', 'Available', 'MI-S-3S-48M');
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(String(init?.body || '{}'));
    expect(body.secret).toBe('mock-secret');
    expect(body.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phone: '01061399688',
          availability: 'Available',
          code: 'MI-S-3S-48M',
        }),
      ]),
    );
  });
});
