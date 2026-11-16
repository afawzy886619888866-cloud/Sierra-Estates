/**
 * POST /api/admin/listings/photos — the admin photo button's backend.
 * The bot never accepts images; photos enter here (device upload → public
 * property-media bucket, or JSON URL persist) and are persisted onto the
 * listing row so they survive a refresh.
 */
jest.mock('@/lib/server/auth-guard', () => ({
  verifyPortalRequest: jest.fn(),
}));

jest.mock('@sierra-estates/db', () => ({
  listRecords: jest.fn(),
  updateRecord: jest.fn(),
  insertRecord: jest.fn(),
}));

jest.mock('@/lib/services/StorageService', () => ({
  StorageService: {
    uploadPropertyMedia: jest.fn(),
  },
}));

import { POST } from '../app/api/admin/listings/photos/route';
import { NextRequest } from 'next/server';
import { verifyPortalRequest } from '@/lib/server/auth-guard';
import { StorageService } from '@/lib/services/StorageService';
import { listRecords, updateRecord } from '@sierra-estates/db';

const verifyPortalRequestMock = verifyPortalRequest as jest.MockedFunction<typeof verifyPortalRequest>;
const uploadMock = StorageService.uploadPropertyMedia as jest.Mock;
const listRecordsMock = listRecords as jest.Mock;
const updateRecordMock = updateRecord as jest.Mock;

const admin = { authenticated: true, access: 'admin' as const, role: 'admin', scope: null };
const partner = {
  authenticated: true,
  access: 'partner' as const,
  uid: 'partner-1',
  email: 'p1@example.com',
  role: 'partner',
  scope: { developers: ['mountain view'], compounds: [] },
};

const jsonReq = (body: unknown) =>
  new NextRequest('http://localhost:3000/api/admin/listings/photos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const multipartReq = async (code: string) => {
  const fd = new FormData();
  fd.append('code', code);
  fd.append('file', new File([new Uint8Array([1, 2, 3, 4])], 'unit-photo.jpg', { type: 'image/jpeg' }));
  return new NextRequest('http://localhost:3000/api/admin/listings/photos', { method: 'POST', body: fd });
};

const LISTING = {
  id: 'listing-1',
  code: 'NC-MIV-APT-F2-175M',
  compound: 'Mivida',
  developer: 'Emaar',
  photos: ['https://example.com/existing.jpg'],
};

/** A listing inside the partner's portfolio (developer 'Mountain View'). */
const PARTNER_LISTING = {
  id: 'listing-9',
  code: 'NC-MVI-APT-F3-210M',
  compound: 'iCity',
  developer: 'Mountain View',
  photos: [],
};

/** resolveListing walks code → refId → referenceCode → id; give it a hit per call. */
listRecordsMock.mockImplementation(async (_table: string, opts: any) => {
  const first = opts?.where?.[0];
  if (first?.column === 'code') {
    if (first?.value === LISTING.code) return [LISTING];
    if (first?.value === PARTNER_LISTING.code) return [PARTNER_LISTING];
  }
  return [];
});

describe('POST /api/admin/listings/photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPortalRequestMock.mockResolvedValue(admin);
    updateRecordMock.mockResolvedValue({ ...LISTING });
  });

  it('rejects unauthenticated callers with 401', async () => {
    verifyPortalRequestMock.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await POST(jsonReq({ code: LISTING.code, urls: ['https://x.test/1.jpg'] }));

    expect(res.status).toBe(401);
    expect(updateRecordMock).not.toHaveBeenCalled();
  });

  describe('JSON mode (persist external URLs)', () => {
    it('persists http(s) URLs onto the listing row and merges with existing photos', async () => {
      const res = await POST(jsonReq({ code: LISTING.code, urls: ['https://static.example.com/a.png'] }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(updateRecordMock).toHaveBeenCalledWith('listings', 'listing-1', {
        photos: ['https://example.com/existing.jpg', 'https://static.example.com/a.png'],
        images: ['https://example.com/existing.jpg', 'https://static.example.com/a.png'],
        img: 'https://example.com/existing.jpg',
        updatedAt: expect.any(String),
      });
      expect(uploadMock).not.toHaveBeenCalled();
    });

    it('rejects non-http(s) junk URLs (no javascript: / data: smuggling)', async () => {
      const res = await POST(jsonReq({ code: LISTING.code, urls: ['javascript:alert(1)', 'data:image/png;base64,xx'] }));

      expect(res.status).toBe(400);
      expect(updateRecordMock).not.toHaveBeenCalled();
    });

    it('rejects a missing code or empty urls with 400', async () => {
      expect((await POST(jsonReq({ urls: ['https://x.test/1.jpg'] }))).status).toBe(400);
      expect((await POST(jsonReq({ code: LISTING.code, urls: [] }))).status).toBe(400);
    });

    it('404s an unknown code', async () => {
      const res = await POST(jsonReq({ code: 'NOPE-123', urls: ['https://x.test/1.jpg'] }));

      expect(res.status).toBe(404);
    });
  });

  describe('multipart mode (device upload)', () => {
    it('uploads to the public bucket and persists the returned URL', async () => {
      uploadMock.mockResolvedValue('https://media.supabase.co/property-media/properties/listing-1/abc.jpg');

      const res = await POST(await multipartReq(LISTING.code));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.url).toBe('https://media.supabase.co/property-media/properties/listing-1/abc.jpg');
      expect(uploadMock).toHaveBeenCalledWith(
        'listing-1',
        expect.any(String), // base64 body
        'image/jpeg',
        'unit-photo.jpg'
      );
      expect(updateRecordMock).toHaveBeenCalledWith(
        'listings',
        'listing-1',
        expect.objectContaining({
          photos: expect.arrayContaining(['https://media.supabase.co/property-media/properties/listing-1/abc.jpg']),
          // img stays the first photo of the merged list (the existing primary).
          img: 'https://example.com/existing.jpg',
        })
      );
    });

    it('415s a non-image content type', async () => {
      const fd = new FormData();
      fd.append('code', LISTING.code);
      fd.append('file', new File([new Uint8Array([1])], 'payload.exe', { type: 'application/octet-stream' }));

      const res = await POST(new NextRequest('http://localhost:3000/api/admin/listings/photos', { method: 'POST', body: fd }));

      expect(res.status).toBe(415);
      expect(uploadMock).not.toHaveBeenCalled();
    });
  });

  describe('partner scoping', () => {
    it('403s a partner attaching photos to a unit outside their portfolio', async () => {
      verifyPortalRequestMock.mockResolvedValue(partner);

      const res = await POST(jsonReq({ code: LISTING.code, urls: ['https://x.test/1.jpg'] }));

      expect(res.status).toBe(403);
      expect(updateRecordMock).not.toHaveBeenCalled();
    });

    it('allows a partner to upload photos to their OWN unit', async () => {
      verifyPortalRequestMock.mockResolvedValue(partner);
      uploadMock.mockResolvedValue('https://media.supabase.co/property-media/properties/listing-9/abc.jpg');

      const res = await POST(await multipartReq(PARTNER_LISTING.code));

      expect(res.status).toBe(200);
      expect(updateRecordMock).toHaveBeenCalled();
    });
  });
});
