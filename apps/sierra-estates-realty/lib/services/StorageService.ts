import 'server-only';
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
 * Manages institutional asset storage with high-integrity paths.
 */
export class StorageService {
  /**
   * Uploads base64 media to Supabase Storage.
   * Path: properties/{docId}/{filename}
   */
  static async uploadPropertyMedia(
    docId: string,
    base64Data: string,
    mimeType: string,
    originalName: string = 'upload.jpg'
  ): Promise<string> {
    const extension = mimeType.split('/')[1] || 'jpg';
    const filename = `${crypto.randomUUID()}.${extension}`;
    const filePath = `properties/${docId}/${filename}`;
    const storage = getSupabaseAdmin().storage.from(PROPERTY_MEDIA_BUCKET);

    const cleanBase64 = (base64Data || '').replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // supabase-js resolves with { error } rather than throwing, so an ignored
    // error would hand back a URL for an object that was never written.
    let { error } = await storage.upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error && (error.message?.toLowerCase().includes('bucket not found') || error.message?.toLowerCase().includes('does not exist'))) {
      // Auto-ensure bucket exists on Supabase (e.g. fresh environment or Vercel production deployment)
      await getSupabaseAdmin().storage.createBucket(PROPERTY_MEDIA_BUCKET, { public: true }).catch(() => {});
      const retry = await storage.upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });
      error = retry.error;
    } else if (error && (error.message?.toLowerCase().includes('fetch failed') || error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('timeout'))) {
      // Retry once on transient Vercel serverless network failure
      const retry = await storage.upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });
      error = retry.error;
    }

    if (error) {
      throw new Error(
        `Upload of ${originalName} to ${PROPERTY_MEDIA_BUCKET}/${filePath} failed: ${error.message}`
      );
    }

    const { data } = storage.getPublicUrl(filePath);
    if (!data?.publicUrl) {
      throw new Error(`Could not resolve a public URL for ${filePath}.`);
    }
    return data.publicUrl;
  }
}
