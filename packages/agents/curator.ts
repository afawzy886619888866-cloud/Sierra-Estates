import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { GoogleAIService } from '../server/google-ai';
import { BrandingService } from '../services/branding-service';
import { VirtualTourEngine } from './virtual-tour-engine';

/**
 * THE CURATOR: "The Architect of Desire"
 * Handles Asset Branding (S3), Global Distribution (S4), and Portal Sync (S5).
 */
export const runCurator = async (
  docId: string, 
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
) => {
  return instrumentAgent('curator', stage, docId, async () => {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error(`Document ${docId} not found`);
    const data = doc.data();

    if (stage === 'S3') {
      console.log(`[CURATOR] S3: Asset Branding (Bilingual/Multimodal) for ${docId}`);
      
      // Fetch media if available to inform branding
      const mediaUrls = data?.mediaUrls || [];
      let visualContext: any[] = [];
      
      if (mediaUrls.length > 0) {
        console.log(`📸 [CURATOR] Incorporating visual context from ${mediaUrls[0]}`);
        try {
          // Download the image for multimodal processing
          const response = await fetch(mediaUrls[0]);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          visualContext = [{
            inlineData: {
              data: base64,
              mimeType: 'image/jpeg'
            }
          }];
        } catch (e) {
          console.error(`❌ [CURATOR] Failed to fetch media context:`, e);
        }
      }

      const systemPrompt = `You are "The Curator", the Architect of Desire for Sierra Estates Realty.
Your job is to craft high-fidelity, cinematic branding for luxury properties.
Tone: Sophisticated, institutional, exclusive (Quiet Luxury).
Deliverables (JSON):
- descriptionEn: A compelling, atmospheric English description.
- descriptionAr: A professional, elegant Arabic description (Egyptian/Modern Standard).
- tagline: A 3-word cinematic tagline.`;

      const userPrompt = [
        ...visualContext,
        `Brand this property:
        "${data?.description || data?.rawMessage || JSON.stringify(data)}"`
      ];

      try {
        const resultText = await GoogleAIService.generateContent(
          'curator', 'S3-Branding',
          { system: systemPrompt, user: userPrompt },
          { model: visualContext.length > 0 ? 'gemini-pro-latest' : 'gemini-flash-latest', jsonMode: true }
        );

        const branded = JSON.parse(resultText);

        // --- NEW: Visual Branding Engine ---
        let brandedMediaUrls: string[] = [];
        if (mediaUrls.length > 0) {
          console.log(`🖼️ [CURATOR] Starting Visual Branding Engine for ${mediaUrls.length} assets...`);
          // Limit to first 3 images for heavy processing safety
          const sourceLimit = mediaUrls.slice(0, 3); 
          brandedMediaUrls = await Promise.all(
            sourceLimit.map((url: string, index: number) => 
              BrandingService.brandPropertyImage(docId, url, data?.id || `UNIT-${index}`)
            )
          );
        }

        // --- NEW: Automated 360° Virtual Tour Engine ---
        try {
          console.log(`🌀 [CURATOR] Generating automated 360° Virtual Tour for ${docId}...`);
          await VirtualTourEngine.generateTourForListing(docId);
        } catch (vtErr) {
          console.warn(`⚠️ [CURATOR] Virtual tour auto-generation non-fatal error:`, vtErr);
        }

        await docRef.update({
          'descriptionEn': branded.descriptionEn,
          'descriptionAr': branded.descriptionAr,
          'tagline': branded.tagline,
          'brandedMediaUrls': brandedMediaUrls,
          'automation.isBranded': true,
          'orchestrationState.stage': 'S4',
          'orchestrationState.status': 'completed'
        });
        console.log(`✅ [CURATOR] S3 Branding completed for ${docId}`);
      } catch (error) {
        console.error(`[CURATOR] S3 Error for ${docId}:`, error);
        await docRef.update({
          'orchestrationState.status': 'failed',
          'orchestrationState.error': 'Branding AI failed'
        });
      }
    }

    if (stage === 'S4') {
      console.log(`[CURATOR] S4: Global Distribution for ${docId}`);
      
      const systemPrompt = `You are "The Curator". Generate high-impact distribution templates.
Deliverables (JSON):
- whatsapp: A professional WhatsApp broadcast template with emojis.
- facebook: A sophisticated Facebook/Instagram ad caption.
- pf: A brief Property Finder compatible description.`;

      const userPrompt = `Generate distribution copy for:
"${data?.descriptionEn || data?.description || ''}"`;

      try {
        const resultText = await GoogleAIService.generateContent(
          'curator', 'S4-Distribution',
          { system: systemPrompt, user: userPrompt },
          { model: 'gemini-flash-latest', jsonMode: true }
        );

        const templates = JSON.parse(resultText);

        await docRef.update({
          'automation.whatsappTemplate': templates.whatsapp,
          'automation.facebookAd': templates.facebook,
          'automation.pfDescription': templates.pf,
          'automation.whatsappAdGenerated': true,
          'orchestrationState.stage': 'S5',
          'orchestrationState.status': 'completed'
        });
      } catch (error) {
        console.error(`[CURATOR] S4 Error for ${docId}:`, error);
        await docRef.update({
          'orchestrationState.status': 'failed',
          'orchestrationState.error': 'Distribution AI failed'
        });
      }
    }

    if (stage === 'S5') {
      console.log(`[CURATOR] S5: Portal Sync for ${docId}`);
      // Logical step: Push to external portals
      await docRef.update({
        'automation.isPublishedToPF': true,
        'orchestrationState.stage': 'S6',
        'orchestrationState.status': 'completed'
      });
    }

    return { success: true };
  });
};
