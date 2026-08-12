import { adminApp } from '../server/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * SIERRA ESTATES STORAGE SERVICE
 * Manages institutional asset storage with high-integrity pathing.
 */
export class StorageService {
  private static bucket: ReturnType<ReturnType<typeof getStorage>['bucket']> | null = null;

  private static getBucket() {
    if (this.bucket) {
      return this.bucket;
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || adminApp.options.storageBucket;
    if (!bucketName) {
      throw new Error('Firebase storage bucket is not configured.');
    }

    this.bucket = getStorage(adminApp).bucket(bucketName);
    return this.bucket;
  }

  /**
   * Uploads base64 media to Firebase Storage.
   * Path: properties/{docId}/{filename}
   */
  static async uploadPropertyMedia(
    docId: string,
    base64Data: string,
    mimeType: string,
    originalName: string = 'upload.jpg'
  ): Promise<string> {
    const extension = mimeType.split('/')[1] || 'jpg';
    const filename = `${uuidv4()}.${extension}`;
    const filePath = `properties/${docId}/${filename}`;
    const bucket = this.getBucket();
    const file = bucket.file(filePath);

    const buffer = Buffer.from(base64Data, 'base64');

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName,
          docId,
          source: 'whatsapp'
        }
      },
      public: true
    });

    // Return the public URL
    // Note: In production, you might want to use signed URLs or Firebase's download tokens
    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  }
}
