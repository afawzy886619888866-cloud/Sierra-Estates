import 'server-only';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { BrandingService } from '../services/branding-service';
import { StateManager } from '../orchestration/StateManager';
import { aiService } from '../ai/GoogleAIServiceImpl';

/**
 * THE CURATOR: "The Architect of Desire"
 * Handles Asset Branding (S3), Global Distribution (S4), and Portal Sync (S5).
 *
 * Pure agent: only orchestrates logic, doesn't read/write Firestore directly.
 */
export const runCurator = async (
  docId: string,
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
) => {
  return instrumentAgent('curator', stage, docId, async () => {
    // Verify document exists
    const doc = await StateManager.getDocument(docId, collection);
    if (!doc) throw new Error(`Document ${docId} not found`);

    if (stage === 'S3') {
      console.log(`[CURATOR] S3: Asset Branding (Bilingual/Multimodal) for ${docId}`);

      const mediaUrls = doc?.mediaUrls || [];

      const systemPrompt = `You are "The Curator", the Architect of Desire for Sierra Estates Realty.
Your job is to craft high-fidelity, cinematic branding for luxury properties.
Tone: Sophisticated, institutional, exclusive (Quiet Luxury).
Deliverables (JSON):
- descriptionEn: A compelling, atmospheric English description.
- descriptionAr: A professional, elegant Arabic description (Egyptian/Modern Standard).
- tagline: A 3-word cinematic tagline.`;

      const userPrompt = [
        // Multimodal support: fetch first image if available
        ...(mediaUrls.length > 0
          ? [
              {
                inlineData: {
                  data: await fetch(mediaUrls[0])
                    .then((r) => r.arrayBuffer())
                    .then((b) => Buffer.from(b).toString('base64'))
                    .catch(() => ''),
                  mimeType: 'image/jpeg',
                },
              },
            ]
          : []),
        `Brand this property: "${doc?.description || doc?.rawMessage || JSON.stringify(doc)}"`,
      ];

      try {
        const branded = await aiService.generateJSON(
          'curator', 'S3-Branding',
          { system: systemPrompt, user: userPrompt },
          { model: mediaUrls.length > 0 ? 'vision' : 'standard' }
        );

        // --- Visual Branding Engine ---
        let brandedMediaUrls: string[] = [];
        if (mediaUrls.length > 0) {
          console.log(`🖼️ [CURATOR] Starting Visual Branding Engine for ${mediaUrls.length} assets...`);
          const sourceLimit = mediaUrls.slice(0, 3);
          brandedMediaUrls = await Promise.all(
            sourceLimit.map((url: string, index: number) =>
              BrandingService.brandPropertyImage(docId, url, doc?.id || `UNIT-${index}`)
            )
          );
        }

        await StateManager.completeStage(docId, collection, 'S4', {
          'descriptionEn': branded.descriptionEn,
          'descriptionAr': branded.descriptionAr,
          'tagline': branded.tagline,
          'brandedMediaUrls': brandedMediaUrls,
          'automation.isBranded': true,
        });
        console.log(`✅ [CURATOR] S3 Branding completed for ${docId}`);
      } catch (error) {
        console.error('[CURATOR] S3 Error', { docId, error });
        await StateManager.failStage(docId, collection, stage, 'Branding AI failed');
      }
    }

    if (stage === 'S4') {
      console.log(`[CURATOR] S4: Global Distribution for ${docId}`);

      const systemPrompt = `You are "The Curator". Generate high-impact distribution templates.
Deliverables (JSON):
- whatsapp: A professional WhatsApp broadcast template with emojis.
- facebook: A sophisticated Facebook/Instagram ad caption.
- pf: A brief Property Finder compatible description.`;

      const userPrompt = `Generate distribution copy for: "${doc?.descriptionEn || doc?.description || ''}"`;

      try {
        const templates = await aiService.generateJSON(
          'curator', 'S4-Distribution',
          { system: systemPrompt, user: userPrompt },
          { model: 'fast' }
        );

        await StateManager.completeStage(docId, collection, 'S5', {
          'automation.whatsappTemplate': templates.whatsapp,
          'automation.facebookAd': templates.facebook,
          'automation.pfDescription': templates.pf,
          'automation.whatsappAdGenerated': true,
        });
      } catch (error) {
        console.error('[CURATOR] S4 Error', { docId, error });
        await StateManager.failStage(docId, collection, stage, 'Distribution AI failed');
      }
    }

    if (stage === 'S5') {
      console.log(`[CURATOR] S5: Portal Sync for ${docId}`);
      await StateManager.completeStage(docId, collection, 'S6', {
        'automation.isPublishedToPF': true,
      });
    }

    return { success: true };
  });
};
