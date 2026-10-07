/**
 * WhatsApp webhook MEDIA POLICY — the bot accepts CONVERSATIONS (text, image
 * captions) but NOT IMAGES: media is never parsed, never stored; a media-only
 * DM gets the polite decline copy, groups are skipped silently.
 *
 * The shared-secret gate runs first (fail closed) — the tests configure
 * SBR_SECRET_KEY so the payload reaches the media branch.
 */
jest.mock('../lib/services/WhatsAppStatusService', () => ({
  WhatsAppStatusService: {
    recordHeartbeat: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../lib/services/WhatsAppParserService', () => ({
  WhatsAppParserService: {
    processIncomingMessage: jest.fn().mockResolvedValue({ id: 'mock-123' }),
  },
}));

import { POST } from '../app/api/webhooks/whatsapp/route';
import { NextRequest } from 'next/server';
import { WhatsAppParserService } from '../lib/services/WhatsAppParserService';

const processIncomingMessage = WhatsAppParserService.processIncomingMessage as jest.Mock;

const metaMessage = (type: string, payload: Record<string, unknown> = {}) => ({
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: '201000000001' }],
            messages: [{ from: '201000000001', type, ...payload }],
          },
        },
      ],
    },
  ],
});

const post = (body: unknown) => {
  process.env.SBR_SECRET_KEY = 'test-secret';
  try {
    return POST(
      new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-sbr-secret-key': 'test-secret' },
        body: JSON.stringify(body),
      })
    );
  } finally {
    delete process.env.SBR_SECRET_KEY;
  }
};

describe('WhatsApp webhook — media policy (text yes, images no)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('politely declines an image DM: 200 + decline copy, never parsed', async () => {
    const res = await post(metaMessage('image', { image: { id: 'media-1', mime_type: 'image/jpeg' } }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.type).toBe('media_declined_text_only_bot');
    expect(body.media_type).toBe('image');
    expect(processIncomingMessage).not.toHaveBeenCalled();
  });

  it('politely declines video/sticker/document DMs the same way', async () => {
    for (const type of ['video', 'sticker', 'document']) {
      const res = await post(metaMessage(type, { [type]: { id: 'media-x' } }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.type).toBe('media_declined_text_only_bot');
    }
    expect(processIncomingMessage).not.toHaveBeenCalled();
  });

  it('skips images in GROUPS silently (no decline spam in broker groups)', async () => {
    const body = metaMessage('image', { image: { id: 'media-1' } });
    (body.entry[0].changes[0].value.messages[0] as any).from = '120363@g.us';

    const res = await post(body);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ status: 'skipped', reason: 'media_not_supported_in_group' });
    expect(processIncomingMessage).not.toHaveBeenCalled();
  });

  it('treats an image CAPTION as conversation text — parsed, image ignored', async () => {
    const caption = 'شقة 3 غرف ميفيدا 175م الدور الثاني 14 مليون';
    const res = await post(
      metaMessage('image', { image: { id: 'media-1', caption } })
    );

    // Group routing: the sender is a wa_id DM here, so the caption flows into
    // the conversational branch; the message must NOT be rejected as empty.
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.type ?? 'conversation').not.toBe('media_declined_text_only_bot');
  });

  it('keeps plain text DMs flowing through the conversational branch', async () => {
    const res = await post(metaMessage('text', { text: { body: 'مرحبا عايز أعرف تفاصيل ميفيدا' } }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(processIncomingMessage).not.toHaveBeenCalled(); // DM → conversational AI, not the group parser
  });
});
