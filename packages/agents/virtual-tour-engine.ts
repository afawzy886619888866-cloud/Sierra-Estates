import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';
import { instrumentAgent } from '../arize';

export interface TourRoomNode {
  id: string;
  name: string;
  nameAr: string;
  panoramaUrl: string;
  thumbnailUrl?: string;
  initialView: { pitch: number; yaw: number; fov: number };
  hotspots: Array<{
    id: string;
    targetRoomId: string;
    pitch: number;
    yaw: number;
    title: string;
    titleAr: string;
    type: 'nav' | 'info';
    infoText?: string;
    infoTextAr?: string;
  }>;
  narrationEn?: string;
  narrationAr?: string;
}

export interface VirtualTourConfig {
  tourId: string;
  unitId: string;
  unitTitle: string;
  defaultRoomId: string;
  rooms: TourRoomNode[];
  vrEnabled: boolean;
  audioNarrationEnabled: boolean;
  createdAt: string;
}

/**
 * VIRTUAL TOUR ENGINE: "The VR Architect"
 * Automatically converts listing images & metadata into an interactive 360° WebXR virtual tour experience.
 */
export class VirtualTourEngine {
  public static async generateTourForListing(docId: string): Promise<VirtualTourConfig> {
    return instrumentAgent('curator', 'S3', docId, async () => {
      console.log(`🌀 [VIRTUAL-TOUR-ENGINE] Building 360° VR Tour for listing: ${docId}`);
      
      const docRef = adminDb.collection(COLLECTIONS.PROPERTIES || 'properties').doc(docId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error(`Property ${docId} not found`);
      }
      
      const data = doc.data();
      const mediaUrls: string[] = data?.mediaUrls || data?.images || [
        'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1600&q=85',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1600&q=85',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85'
      ];
      
      const defaultRoomTypes = [
        { en: 'Main Living Hall', ar: 'غرفة المعيشة الرئيسية', pitch: 0, yaw: 0 },
        { en: 'Master Suite', ar: 'جناح النوم الرئيسي', pitch: -5, yaw: 45 },
        { en: 'Chef Kitchen & Dining', ar: 'المطبخ وغرفة الطعام', pitch: 5, yaw: 90 },
        { en: 'Panoramic Terrace', ar: 'التراس البانورامي', pitch: 0, yaw: 180 }
      ];

      // Use AI to generate intelligent hotspot annotations and room titles
      const systemPrompt = `You are a 360° Virtual Reality Spatial Tour Designer for Sierra Estates Realty.
Generate an interactive WebXR 360° tour configuration for a luxury unit listing.
Deliver JSON output matching this schema:
{
  "rooms": [
    {
      "name": "Room Name En",
      "nameAr": "Room Name Ar",
      "narrationEn": "Brief audio narration description in English",
      "narrationAr": "Brief audio narration in Arabic",
      "featureHotspot": { "titleEn": "Feature title", "titleAr": "Feature title Ar", "descriptionEn": "Details", "descriptionAr": "Details Ar" }
    }
  ]
}`;

      let aiRoomData: any = null;
      try {
        const responseText = await GoogleAIService.generateContent(
          'curator',
          'S3-VirtualTour',
          { system: systemPrompt, user: `Property: ${data?.title || docId}. Media count: ${mediaUrls.length}` },
          { model: 'gemini-flash-latest', jsonMode: true }
        );
        aiRoomData = JSON.parse(responseText);
      } catch (err) {
        console.warn(`[VIRTUAL-TOUR-ENGINE] AI enrichment fallback used:`, err);
      }

      const rooms: TourRoomNode[] = mediaUrls.map((url: string, idx: number) => {
        const fallbackType = defaultRoomTypes[idx % defaultRoomTypes.length];
        const aiRoom = aiRoomData?.rooms?.[idx];
        const roomId = `room-${idx + 1}`;
        const nextRoomId = `room-${((idx + 1) % mediaUrls.length) + 1}`;

        return {
          id: roomId,
          name: aiRoom?.name || fallbackType.en,
          nameAr: aiRoom?.nameAr || fallbackType.ar,
          panoramaUrl: url,
          thumbnailUrl: url,
          initialView: { pitch: fallbackType.pitch, yaw: fallbackType.yaw, fov: 75 },
          narrationEn: aiRoom?.narrationEn || `Welcome to the ${fallbackType.en} featuring high-end spatial finishes and natural lighting.`,
          narrationAr: aiRoom?.narrationAr || `مرحباً بكم في ${fallbackType.ar} مع تشطيبات فاخرة وإضاءة طبيعية.`,
          hotspots: [
            {
              id: `nav-${idx}-next`,
              targetRoomId: nextRoomId,
              pitch: -10,
              yaw: 30,
              title: `Enter Next Room`,
              titleAr: `الانتقال إلى الغرفة التالية`,
              type: 'nav'
            },
            {
              id: `info-${idx}-feat`,
              targetRoomId: roomId,
              pitch: 15,
              yaw: -20,
              title: aiRoom?.featureHotspot?.titleEn || 'Luxury Finish',
              titleAr: aiRoom?.featureHotspot?.titleAr || 'تشطيب فاخر',
              type: 'info',
              infoText: aiRoom?.featureHotspot?.descriptionEn || 'Italian imported porcelain and custom architectural lighting.',
              infoTextAr: aiRoom?.featureHotspot?.descriptionAr || 'بورسلين إيطالي فاخر مع إضاءة معمارية مخصصة.'
            }
          ]
        };
      });

      const tourConfig: VirtualTourConfig = {
        tourId: `vt-${docId}`,
        unitId: docId,
        unitTitle: data?.title || `Unit ${docId}`,
        defaultRoomId: rooms[0]?.id || 'room-1',
        rooms: rooms,
        vrEnabled: true,
        audioNarrationEnabled: true,
        createdAt: new Date().toISOString()
      };

      // Save tour config back to Firestore document
      await docRef.update({
        'virtualTour': tourConfig,
        'automation.hasVirtualTour': true,
        'updatedAt': new Date().toISOString()
      });

      console.log(`✅ [VIRTUAL-TOUR-ENGINE] 360° VR Tour generated successfully for ${docId}`);
      return tourConfig;
    });
  }
}
