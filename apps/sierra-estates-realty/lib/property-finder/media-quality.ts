/**
 * Property Finder Enterprise (Atlas OpenAPI 3.1.0) — Ad Media Quality Gate.
 *
 * Enforces Sierra Estates' Property Finder Ad Approval standard:
 *   1. Minimum 6 genuine HTTPS listing photos (`PF_AD_MIN_PHOTOS = 6`).
 *   2. Minimum pixel resolution per qualifying photo (`PF_MIN_IMAGE_WIDTH = 800`,
 *      `PF_MIN_IMAGE_HEIGHT = 600` — rejects blurry thumbnails like 668x455).
 *   3. Maximum file size (`PF_MAX_IMAGE_BYTES = 10 MB`).
 *   4. Reachability check via HTTP Range (`bytes=0-65535`) so dead/expired CDN
 *      URLs (HTTP 403/404) are never submitted to Property Finder.
 */

export const PF_AD_MIN_PHOTOS = 6;
export const PF_MIN_IMAGE_WIDTH = 800;
export const PF_MIN_IMAGE_HEIGHT = 600;
export const PF_MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'unknown';

export interface ImageDimensions {
  width: number;
  height: number;
  format: ImageFormat;
}

export interface ProbedPhotoReport {
  url: string;
  reachable: boolean;
  httpStatus: number | null;
  width: number | null;
  height: number | null;
  format: ImageFormat;
  byteSize: number | null;
  meetsMinDimensions: boolean;
  meetsMaxBytes: boolean;
  qualifying: boolean;
  issue: string | null;
}

export interface PfMediaReadinessReport {
  ready: boolean;
  requiredPhotos: number;
  minWidth: number;
  minHeight: number;
  totalCandidateUrls: number;
  qualifyingCount: number;
  missingCount: number;
  photos: ProbedPhotoReport[];
  errors: string[];
}

const STOCK_OR_PLACEHOLDER_RE =
  /(unsplash\.com|pexels\.com|pixabay\.com|wikimedia\.org|placehold\.co|placeholder|dummyimage)/i;

/**
 * Checks whether a value is a non-placeholder HTTPS URL.
 */
export function isGenuineListingPhotoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed) || trimmed.length < 16) return false;
  if (STOCK_OR_PLACEHOLDER_RE.test(trimmed)) return false;
  return true;
}

function readU16BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] << 8) | buf[offset + 1]) >>> 0;
}

function readU16LE(buf: Uint8Array, offset: number): number {
  return (buf[offset] | (buf[offset + 1] << 8)) >>> 0;
}

function readU32BE(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset] * 0x1000000) +
      ((buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3])) >>>
    0
  );
}

function asciiSlice(buf: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end && i < buf.length; i++) {
    out += String.fromCharCode(buf[i]);
  }
  return out;
}

/**
 * Dependency-free binary header parser for PNG, JPEG, WebP, and GIF.
 * Parses exact pixel width & height from the first <=64 KB of an image stream.
 */
export function parseImageDimensionsFromBuffer(buf: Uint8Array): ImageDimensions | null {
  if (!buf || buf.length < 10) return null;

  // 1. PNG (8-byte signature + IHDR width/height at bytes 16..23)
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    const width = readU32BE(buf, 16);
    const height = readU32BE(buf, 20);
    if (width > 0 && height > 0) {
      return { width, height, format: 'png' };
    }
  }

  // 2. GIF87a / GIF89a
  const gifHeader = asciiSlice(buf, 0, 6);
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    const width = readU16LE(buf, 6);
    const height = readU16LE(buf, 8);
    if (width > 0 && height > 0) {
      return { width, height, format: 'gif' };
    }
  }

  // 3. JPEG (SOI 0xFFD8 followed by segment markers; SOF0..SOF15 carry height/width)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        i += 2;
        continue;
      }
      const segLen = readU16BE(buf, i + 2);
      if (segLen < 2) break;
      const isSof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof) {
        const height = readU16BE(buf, i + 5);
        const width = readU16BE(buf, i + 7);
        if (width > 0 && height > 0) {
          return { width, height, format: 'jpeg' };
        }
        break;
      }
      i += 2 + segLen;
    }
  }

  // 4. WebP (RIFF....WEBP + VP8 / VP8L / VP8X)
  if (buf.length >= 25 && asciiSlice(buf, 0, 4) === 'RIFF' && asciiSlice(buf, 8, 12) === 'WEBP') {
    const chunkType = asciiSlice(buf, 12, 16);
    if (chunkType === 'VP8 ' && buf.length >= 30) {
      const width = readU16LE(buf, 26) & 0x3fff;
      const height = readU16LE(buf, 28) & 0x3fff;
      if (width > 0 && height > 0) return { width, height, format: 'webp' };
    } else if (chunkType === 'VP8L' && buf.length >= 25) {
      const b0 = buf[21];
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width > 0 && height > 0) return { width, height, format: 'webp' };
    } else if (chunkType === 'VP8X' && buf.length >= 30) {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      if (width > 0 && height > 0) return { width, height, format: 'webp' };
    }
  }

  return null;
}

function parseTotalBytesFromHeaders(headers: Headers, fallbackLength: number): number | null {
  const contentRange = headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)\s*$/);
    if (match) {
      const total = Number(match[1]);
      if (Number.isFinite(total) && total > 0) return total;
    }
  }
  const contentLength = headers.get('content-length');
  if (contentLength) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len > 0) return len;
  }
  return fallbackLength > 0 ? fallbackLength : null;
}

/**
 * Probes the first 64 KB of a remote HTTPS image to verify HTTP reachability,
 * pixel resolution (`>= 800x600`), and byte size (`<= 10 MB`).
 */
export async function probeRemoteImageQuality(
  rawUrl: string,
  timeoutMs = 8000
): Promise<ProbedPhotoReport> {
  const url = String(rawUrl || '').trim();
  if (!isGenuineListingPhotoUrl(url)) {
    return {
      url,
      reachable: false,
      httpStatus: null,
      width: null,
      height: null,
      format: 'unknown',
      byteSize: null,
      meetsMinDimensions: false,
      meetsMaxBytes: false,
      qualifying: false,
      issue: 'Not a genuine HTTPS property photo URL (stock/placeholder or non-HTTPS).',
    };
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-65535',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok && res.status !== 206) {
      return {
        url,
        reachable: false,
        httpStatus: res.status,
        width: null,
        height: null,
        format: 'unknown',
        byteSize: null,
        meetsMinDimensions: false,
        meetsMaxBytes: false,
        qualifying: false,
        issue: `Image unreachable (HTTP ${res.status}).`,
      };
    }

    const ab = await res.arrayBuffer();
    const bytes = new Uint8Array(ab.slice(0, 65536));
    const byteSize = parseTotalBytesFromHeaders(res.headers, ab.byteLength);
    const dims = parseImageDimensionsFromBuffer(bytes);

    if (!dims) {
      return {
        url,
        reachable: true,
        httpStatus: res.status,
        width: null,
        height: null,
        format: 'unknown',
        byteSize,
        meetsMinDimensions: false,
        meetsMaxBytes: byteSize === null ? true : byteSize <= PF_MAX_IMAGE_BYTES,
        qualifying: false,
        issue: 'Could not decode image pixel dimensions from header.',
      };
    }

    const meetsMinDimensions =
      dims.width >= PF_MIN_IMAGE_WIDTH && dims.height >= PF_MIN_IMAGE_HEIGHT;
    const meetsMaxBytes = byteSize === null ? true : byteSize <= PF_MAX_IMAGE_BYTES;
    const qualifying = meetsMinDimensions && meetsMaxBytes;

    let issue: string | null = null;
    if (!meetsMinDimensions) {
      issue = `Resolution ${dims.width}x${dims.height}px is below Property Finder minimum (${PF_MIN_IMAGE_WIDTH}x${PF_MIN_IMAGE_HEIGHT}px).`;
    } else if (!meetsMaxBytes && byteSize !== null) {
      issue = `File size ${(byteSize / (1024 * 1024)).toFixed(1)}MB exceeds 10MB limit.`;
    }

    return {
      url,
      reachable: true,
      httpStatus: res.status,
      width: dims.width,
      height: dims.height,
      format: dims.format,
      byteSize,
      meetsMinDimensions,
      meetsMaxBytes,
      qualifying,
      issue,
    };
  } catch (err) {
    return {
      url,
      reachable: false,
      httpStatus: null,
      width: null,
      height: null,
      format: 'unknown',
      byteSize: null,
      meetsMinDimensions: false,
      meetsMaxBytes: false,
      qualifying: false,
      issue: `Network probe failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Evaluates full Property Finder 6-photo + pixel-resolution readiness for a unit.
 */
export async function evaluatePfAdMediaReadiness(
  urls: unknown[],
  options?: {
    probeNetwork?: boolean;
    timeoutMs?: number;
    preProbed?: ProbedPhotoReport[];
  }
): Promise<PfMediaReadinessReport> {
  const uniqueUrls = Array.from(
    new Set(
      (Array.isArray(urls) ? urls : [])
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim())
    )
  );

  let photos: ProbedPhotoReport[];
  if (options?.preProbed) {
    photos = options.preProbed;
  } else if (options?.probeNetwork === false) {
    photos = uniqueUrls.map((url) => {
      const okUrl = isGenuineListingPhotoUrl(url);
      return {
        url,
        reachable: okUrl,
        httpStatus: null,
        width: null,
        height: null,
        format: 'unknown',
        byteSize: null,
        meetsMinDimensions: okUrl,
        meetsMaxBytes: okUrl,
        qualifying: okUrl,
        issue: okUrl ? null : 'Invalid or placeholder image URL.',
      };
    });
  } else {
    photos = await Promise.all(
      uniqueUrls.slice(0, 20).map((u) => probeRemoteImageQuality(u, options?.timeoutMs ?? 8000))
    );
  }

  const qualifyingCount = photos.filter((p) => p.qualifying).length;
  const missingCount = Math.max(0, PF_AD_MIN_PHOTOS - qualifyingCount);
  const errors: string[] = [];

  if (qualifyingCount < PF_AD_MIN_PHOTOS) {
    errors.push(
      `Property Finder requires at least ${PF_AD_MIN_PHOTOS} qualifying photos (>=${PF_MIN_IMAGE_WIDTH}x${PF_MIN_IMAGE_HEIGHT}px); found ${qualifyingCount} qualifying out of ${uniqueUrls.length} total.`
    );
  }
  for (const p of photos) {
    if (p.issue) errors.push(`${p.url}: ${p.issue}`);
  }

  return {
    ready: qualifyingCount >= PF_AD_MIN_PHOTOS,
    requiredPhotos: PF_AD_MIN_PHOTOS,
    minWidth: PF_MIN_IMAGE_WIDTH,
    minHeight: PF_MIN_IMAGE_HEIGHT,
    totalCandidateUrls: uniqueUrls.length,
    qualifyingCount,
    missingCount,
    photos,
    errors,
  };
}
