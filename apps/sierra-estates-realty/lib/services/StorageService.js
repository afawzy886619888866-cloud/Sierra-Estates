 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';
import { getSupabaseAdmin } from '@sierra-estates/db';
import * as crypto from 'crypto';

/**
 * Supabase Storage bucket for property media.
 *
 * Deliberately NOT the same bucket as `SUPABASE_MEDIA_BUCKET` (see
 * app/api/admin/media/upload), which is private and handed out as short-lived
 * signed URLs. The URLs produced here are written onto listing rows and
 * rendered on the public site for the life of the listing, so a signed URL
 * would go dead — this bucket must be PUBLIC, matching the `public: true`
 * upload the Firebase Storage version used.
 */
const PROPERTY_MEDIA_BUCKET =
  process.env.SUPABASE_PROPERTY_MEDIA_BUCKET || 'property-media';

/**
 * SIERRA ESTATES STORAGE SERVICE
 * Manages institutional asset storage with high-integrity pathing.
 */
export class StorageService {
  /**
   * Uploads base64 media to Supabase Storage.
   * Path: properties/{docId}/{filename}
   */
  static async uploadPropertyMedia(
    docId,
    base64Data,
    mimeType,
    originalName = 'upload.jpg'
  ) {
    const extension = mimeType.split('/')[1] || 'jpg';
    const filename = `${crypto.randomUUID()}.${extension}`;
    const filePath = `properties/${docId}/${filename}`;
    const storage = getSupabaseAdmin().storage.from(PROPERTY_MEDIA_BUCKET);

    const buffer = Buffer.from(base64Data, 'base64');

    // supabase-js resolves with { error } rather than throwing, so an ignored
    // error would hand back a URL for an object that was never written.
    const { error } = await storage.upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) {
      throw new Error(
        `Upload of ${originalName} to ${PROPERTY_MEDIA_BUCKET}/${filePath} failed: ${error.message}`
      );
    }

    const { data } = storage.getPublicUrl(filePath);
    if (!_optionalChain([data, 'optionalAccess', _ => _.publicUrl])) {
      throw new Error(`Could not resolve a public URL for ${filePath}.`);
    }
    return data.publicUrl;
  }
}
