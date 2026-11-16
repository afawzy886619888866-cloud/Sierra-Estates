/**
 * video-teaser.ts
 *
 * Automated Luxury Property Video Tour & WhatsApp Teaser Generator for Sierra Estates.
 * Assembles multi-scene video storyboards, yield highlights, and WhatsApp dispatch payloads.
 */

export interface VideoTeaserRequest {
  sierraCode: string;
  compound: string;
  unitType: string;
  priceEGP: number;
  areaSqm: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: string[];
  subfeatures?: string[];
  targetChannel?: 'whatsapp' | 'instagram_reels' | 'portal';
}

export interface VideoTeaserFrame {
  sceneIndex: number;
  timestampSeconds: number;
  durationSeconds: number;
  visualType: 'hero_facade' | 'interior_living' | 'masterplan_drone' | 'financial_yield' | 'call_to_action';
  captionAr: string;
  captionEn: string;
  mediaUrl?: string;
  overlayMetrics?: Record<string, string | number>;
}

export interface VideoTeaserResponse {
  teaserId: string;
  timestamp: string;
  sierraCode: string;
  compound: string;
  videoDurationSeconds: number;
  aspectRatio: '9:16' | '16:9';
  storyboard: VideoTeaserFrame[];
  videoStreamUrl: string;
  thumbnailUrl: string;
  whatsAppSharePayload: {
    caption: string;
    mediaUrl: string;
  };
}

export class VideoTeaserEngine {
  /**
   * Synthesize a multi-scene luxury property video tour storyboard.
   */
  public static generateStoryboard(request: VideoTeaserRequest): VideoTeaserFrame[] {
    const priceMillions = (request.priceEGP / 1000000).toFixed(1);
    const pricePerSqm = request.areaSqm > 0 ? Math.round(request.priceEGP / request.areaSqm) : 0;
    const images = request.images && request.images.length > 0
      ? request.images
      : ['/images/placeholder-luxury-1.jpg', '/images/placeholder-luxury-2.jpg'];

    const subfeatureText = request.subfeatures && request.subfeatures.length > 0
      ? request.subfeatures.join(' • ')
      : 'إطلالة مفتوحة على المساحات الخضراء';

    const frames: VideoTeaserFrame[] = [
      {
        sceneIndex: 1,
        timestampSeconds: 0,
        durationSeconds: 3,
        visualType: 'hero_facade',
        captionAr: `${request.compound} — ${request.unitType} فاخرة للبيع`,
        captionEn: `Exclusive ${request.unitType} in ${request.compound}`,
        mediaUrl: images[0],
        overlayMetrics: {
          compound: request.compound,
          unitType: request.unitType,
        },
      },
      {
        sceneIndex: 2,
        timestampSeconds: 3,
        durationSeconds: 3,
        visualType: 'masterplan_drone',
        captionAr: `موقع استراتيجي متميز | ${subfeatureText}`,
        captionEn: `Prime Location & Lifestyle Amenities`,
        mediaUrl: images[1] || images[0],
        overlayMetrics: {
          areaSqm: `${request.areaSqm} m²`,
          bedrooms: request.bedrooms ? `${request.bedrooms} Beds` : '3 Beds',
        },
      },
      {
        sceneIndex: 3,
        timestampSeconds: 6,
        durationSeconds: 3,
        visualType: 'financial_yield',
        captionAr: `السعر: ${priceMillions} مليون جنيه | المتر: ${pricePerSqm.toLocaleString()} ج`,
        captionEn: `Listed at ${priceMillions}M EGP (${pricePerSqm.toLocaleString()} EGP/m²)`,
        mediaUrl: images[0],
        overlayMetrics: {
          priceEGP: request.priceEGP,
          pricePerSqm,
          annualYield: '8.5% ROI',
        },
      },
      {
        sceneIndex: 4,
        timestampSeconds: 9,
        durationSeconds: 3,
        visualType: 'call_to_action',
        captionAr: `للحجز والمعاينة المباشرة: تواصل معنا عبر واتساب +201092048333`,
        captionEn: `Book a Private Viewing: WhatsApp +201092048333`,
        mediaUrl: images[0],
        overlayMetrics: {
          contact: '+201092048333',
          brand: 'Sierra Estates',
        },
      },
    ];

    return frames;
  }

  /**
   * Assemble full video teaser response and WhatsApp dispatch packet.
   */
  public static async createTeaser(request: VideoTeaserRequest): Promise<VideoTeaserResponse> {
    const teaserId = `vt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const storyboard = this.generateStoryboard(request);
    const totalDuration = storyboard.reduce((acc, f) => acc + f.durationSeconds, 0);
    const aspectRatio: '9:16' | '16:9' = request.targetChannel === 'whatsapp' || request.targetChannel === 'instagram_reels'
      ? '9:16'
      : '16:9';

    const priceMillions = (request.priceEGP / 1000000).toFixed(1);
    const thumbnailUrl = (request.images && request.images[0]) || '/images/placeholder-luxury-1.jpg';
    const videoStreamUrl = `https://media.sierra-estates.net/videos/teasers/${teaserId}.mp4`;

    const whatsAppCaption = `✨ *معاينة فيديو حصرية من سييرا إستيتس* ✨\n\n` +
      `🏡 *الوحدة:* ${request.unitType} كود ${request.sierraCode}\n` +
      `📍 *الكمبوند:* ${request.compound}\n` +
      `📐 *المساحة:* ${request.areaSqm} متر مربع\n` +
      `💰 *السعر المطلوب:* ${priceMillions} مليون جنيه\n\n` +
      `🎥 شاهد جولة الفيديو السريعة أعلاه 👆\n` +
      `للمعاينة الميدانية أو للتفاوض المباشر مع المالك، تواصل مع فريقنا: https://wa.me/201092048333`;

    return {
      teaserId,
      timestamp: new Date().toISOString(),
      sierraCode: request.sierraCode,
      compound: request.compound,
      videoDurationSeconds: totalDuration,
      aspectRatio,
      storyboard,
      videoStreamUrl,
      thumbnailUrl,
      whatsAppSharePayload: {
        caption: whatsAppCaption,
        mediaUrl: videoStreamUrl,
      },
    };
  }
}
