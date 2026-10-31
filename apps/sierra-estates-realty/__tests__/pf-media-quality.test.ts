import { NextRequest } from 'next/server';
import {
  PF_AD_MIN_PHOTOS,
  PF_MIN_IMAGE_WIDTH,
  PF_MIN_IMAGE_HEIGHT,
  parseImageDimensionsFromBuffer,
  evaluatePfAdMediaReadiness,
  type ProbedPhotoReport,
} from '../lib/property-finder/media-quality';
import { EgyptListingValidator } from '../lib/property-finder/validation';
import type { PFListingRequest } from '../lib/property-finder/types';

const mockVerifyAdminRequest = jest.fn();

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => mockVerifyAdminRequest(...args),
}));

jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: jest.fn(),
  updateRecord: jest.fn(),
  getRecord: jest.fn(),
  insertRecord: jest.fn(),
  listRecords: jest.fn(),
}));

import { GET as getPfApproval, POST as postPfApproval } from '../app/api/admin/pf-approval/route';

function makePngBuffer(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(24);
  // PNG signature
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length + 'IHDR'
  buf.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(buf.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return buf;
}

function makeJpegBuffer(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(20);
  // SOI 0xFFD8 + SOF0 0xFFC0 + length 11 + precision 8
  buf.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08], 0);
  const view = new DataView(buf.buffer);
  view.setUint16(7, height, false);
  view.setUint16(9, width, false);
  return buf;
}

function makeValidRequest(imageUrls: string[]): PFListingRequest {
  return {
    reference: 'SE-TEST-6PHOTO',
    category: 'residential',
    type: 'villa',
    offeringType: 'sale',
    location: { id: 2751 },
    size: 420,
    bedrooms: '5',
    bathrooms: '5',
    title: { en: 'Luxury Standalone Villa in Mivida New Cairo' },
    description: {
      en: 'Spacious standalone villa in Mivida featuring private garden and prime location in New Cairo.',
    },
    price: {
      type: 'sale',
      amounts: { sale: 45_000_000 },
    },
    media: {
      images: imageUrls.map((url) => ({ original: { url } })),
    },
  };
}

describe('Property Finder 6-Photo & >=800x600px Quality Gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pins 6 minimum photos and 800x600 minimum pixel dimensions', () => {
    expect(PF_AD_MIN_PHOTOS).toBe(6);
    expect(PF_MIN_IMAGE_WIDTH).toBe(800);
    expect(PF_MIN_IMAGE_HEIGHT).toBe(600);
  });

  it('parses PNG and JPEG binary dimensions accurately without external dependencies', () => {
    const png = parseImageDimensionsFromBuffer(makePngBuffer(1312, 894));
    expect(png).toEqual({ width: 1312, height: 894, format: 'png' });

    const hiResJpeg = parseImageDimensionsFromBuffer(makeJpegBuffer(1179, 803));
    expect(hiResJpeg).toEqual({ width: 1179, height: 803, format: 'jpeg' });

    const lowResJpeg = parseImageDimensionsFromBuffer(makeJpegBuffer(668, 455));
    expect(lowResJpeg).toEqual({ width: 668, height: 455, format: 'jpeg' });
  });

  it('rejects listings with fewer than 6 photos in validateAdMediaQuality', () => {
    const urls = [
      'https://cdn.sierra-estates.net/units/u1-1.jpg',
      'https://cdn.sierra-estates.net/units/u1-2.jpg',
      'https://cdn.sierra-estates.net/units/u1-3.jpg',
    ];
    const req = makeValidRequest(urls);

    // Base schema validator remains backwards-compatible
    expect(EgyptListingValidator.validate(req).isValid).toBe(true);

    // Strict PF Ad Media Quality validator requires >=6 photos
    const adCheck = EgyptListingValidator.validateAdMediaQuality(req);
    expect(adCheck.isValid).toBe(false);
    expect(adCheck.errors.some((e) => e.includes('at least 6'))).toBe(true);
  });

  it('rejects 6-photo listings when any needed photo is below 800x600px (e.g. 668x455)', async () => {
    const urls = Array.from(
      { length: 6 },
      (_, i) => `https://cdn.sierra-estates.net/units/hydepark-${i + 1}.jpg`
    );
    const preProbed: ProbedPhotoReport[] = urls.map((url, idx) => ({
      url,
      reachable: true,
      httpStatus: 206,
      width: idx === 5 ? 668 : 1280,
      height: idx === 5 ? 455 : 960,
      format: 'jpeg',
      byteSize: 120_000,
      meetsMinDimensions: idx !== 5,
      meetsMaxBytes: true,
      qualifying: idx !== 5,
      issue: idx === 5 ? 'Resolution 668x455px is below Property Finder minimum (800x600px).' : null,
    }));

    const readiness = await evaluatePfAdMediaReadiness(urls, { preProbed });
    expect(readiness.ready).toBe(false);
    expect(readiness.qualifyingCount).toBe(5);
    expect(readiness.missingCount).toBe(1);

    const adCheck = EgyptListingValidator.validateAdMediaQuality(makeValidRequest(urls), preProbed);
    expect(adCheck.isValid).toBe(false);
    expect(adCheck.errors.some((e) => e.includes('668x455px'))).toBe(true);
  });

  it('approves listings when >=6 genuine HTTPS photos meet >=800x600px', async () => {
    const urls = Array.from(
      { length: 6 },
      (_, i) => `https://cdn.sierra-estates.net/units/oriana-${i + 1}.jpg`
    );
    const preProbed: ProbedPhotoReport[] = urls.map((url) => ({
      url,
      reachable: true,
      httpStatus: 206,
      width: 1312,
      height: 894,
      format: 'jpeg',
      byteSize: 220_000,
      meetsMinDimensions: true,
      meetsMaxBytes: true,
      qualifying: true,
      issue: null,
    }));

    const readiness = await evaluatePfAdMediaReadiness(urls, { preProbed });
    expect(readiness.ready).toBe(true);
    expect(readiness.qualifyingCount).toBe(6);
    expect(readiness.missingCount).toBe(0);

    const adCheck = EgyptListingValidator.validateAdMediaQuality(makeValidRequest(urls), preProbed);
    expect(adCheck.isValid).toBe(true);
  });

  it('guards /api/admin/pf-approval GET and POST with verifyAdminRequest (401 unauthenticated)', async () => {
    mockVerifyAdminRequest.mockResolvedValue({ authenticated: false });

    const getRes = await getPfApproval(new NextRequest('https://sierra-estates.net/api/admin/pf-approval'));
    expect(getRes.status).toBe(401);

    const postRes = await postPfApproval(
      new NextRequest('https://sierra-estates.net/api/admin/pf-approval', {
        method: 'POST',
        body: JSON.stringify({
          action: 'approve_and_publish',
          listingId: '8a57c0e3-a677-40a6-b3f9-97f9a4f493bd',
        }),
      })
    );
    expect(postRes.status).toBe(401);
  });
});
