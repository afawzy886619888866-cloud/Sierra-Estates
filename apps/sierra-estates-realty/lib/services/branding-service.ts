import sharp from 'sharp';
import axios from 'axios';
import { StorageService } from './StorageService';
import path from 'path';
import fs from 'fs';

/**
 * SIERRA ESTATES BRANDING ENGINE
 * Level: Institutional / Quiet Luxury
 * Purpose: Automates Stage 3 Branding for property assets.
 */
export class BrandingService {
  private static LOGO_PATH = path.join(process.cwd(), 'public', 'sierra_estates_logo_light.png');

  /**
   * Processes a source image URL and adds the Sierra Estates gold watermark.
   * Returns the uploaded public URL.
   */
  static async brandPropertyImage(
    docId: string, 
    sourceUrl: string, 
    propertyCode: string
  ): Promise<string> {
    try {
      // 1. Fetch source image
      const response = await axios.get(sourceUrl, { responseType: 'arraybuffer' });
      const sourceBuffer = Buffer.from(response.data);

      // 2. Prepare Logo
      let logoBuffer: Buffer;
      if (fs.existsSync(this.LOGO_PATH)) {
        logoBuffer = await sharp(this.LOGO_PATH)
          .resize({ width: 200 }) // Standard institutional size
          .toBuffer();
      } else {
        // Fallback: Create a text-based logo if file is missing
        logoBuffer = await sharp({
          create: {
            width: 300,
            height: 100,
            channels: 4,
            background: { r: 184, g: 134, b: 11, alpha: 0.5 } // Gold-ish
          }
        })
        .composite([{
          input: Buffer.from(`<svg><text x="10" y="40" font-family="Arial" font-size="24" fill="white">SIERRA ESTATES</text></svg>`),
          top: 0,
          left: 0
        }])
        .png()
        .toBuffer();
      }

      // 3. Composite Watermark
      const brandedBuffer = await sharp(sourceBuffer)
        .composite([
          {
            input: logoBuffer,
            gravity: 'southeast', // Institutional bottom-right placement
          },
          {
            input: Buffer.from(
              `<svg width="400" height="50">
                <text x="10" y="40" font-family="Inter, sans-serif" font-size="20" fill="white" fill-opacity="0.5">
                  REF: ${propertyCode} | SIERRA ESTATES REALTY
                </text>
              </svg>`
            ),
            gravity: 'southwest',
          }
        ])
        .jpeg({ quality: 90 }) // High fidelity
        .toBuffer();

      // 4. Upload to Storage via StorageService
      const base64Branded = brandedBuffer.toString('base64');
      const brandedUrl = await StorageService.uploadPropertyMedia(
        docId,
        base64Branded,
        'image/jpeg',
        `branded_${propertyCode}.jpg`
      );

      return brandedUrl;
    } catch (error) {
      console.error('Branding Engine Failure:', error);
      return sourceUrl; // Fallback to original if branding fails
    }
  }
}
