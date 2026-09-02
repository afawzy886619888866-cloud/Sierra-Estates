 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { GoogleAIService } from '../server/google-ai';
import { instrumentAgent } from '../arize';


































/**
 * VIRTUAL TOUR ENGINE: "The VR Architect"
 * Automatically converts listing images & metadata into an interactive 360° WebXR virtual tour experience.
 */
export class VirtualTourEngine {
   static async generateTourForListing(docId) {
    return instrumentAgent('curator', 'S3', docId, async () => {
      console.log(`🌀 [VIRTUAL-TOUR-ENGINE] Building 360° VR Tour for listing: ${docId}`);
      
      const docRef = adminDb.collection(COLLECTIONS.PROPERTIES || 'properties').doc(docId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error(`Property ${docId} not found`);
      }
      
      const data = doc.data();
      const mediaUrls = _optionalChain([data, 'optionalAccess', _ => _.mediaUrls]) || _optionalChain([data, 'optionalAccess', _2 => _2.images]) || [
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

      let aiRoomData = null;
      try {
        const responseText = await GoogleAIService.generateContent(
          'curator',
          'S3-VirtualTour',
          { system: systemPrompt, user: `Property: ${_optionalChain([data, 'optionalAccess', _3 => _3.title]) || docId}. Media count: ${mediaUrls.length}` },
          { model: 'gemini-flash-latest', jsonMode: true }
        );
        aiRoomData = JSON.parse(responseText);
      } catch (err) {
        console.warn(`[VIRTUAL-TOUR-ENGINE] AI enrichment fallback used:`, err);
      }

      const rooms = mediaUrls.map((url, idx) => {
        const fallbackType = defaultRoomTypes[idx % defaultRoomTypes.length];
        const aiRoom = _optionalChain([aiRoomData, 'optionalAccess', _4 => _4.rooms, 'optionalAccess', _5 => _5[idx]]);
        const roomId = `room-${idx + 1}`;
        const nextRoomId = `room-${((idx + 1) % mediaUrls.length) + 1}`;

        return {
          id: roomId,
          name: _optionalChain([aiRoom, 'optionalAccess', _6 => _6.name]) || fallbackType.en,
          nameAr: _optionalChain([aiRoom, 'optionalAccess', _7 => _7.nameAr]) || fallbackType.ar,
          panoramaUrl: url,
          thumbnailUrl: url,
          initialView: { pitch: fallbackType.pitch, yaw: fallbackType.yaw, fov: 75 },
          narrationEn: _optionalChain([aiRoom, 'optionalAccess', _8 => _8.narrationEn]) || `Welcome to the ${fallbackType.en} featuring high-end spatial finishes and natural lighting.`,
          narrationAr: _optionalChain([aiRoom, 'optionalAccess', _9 => _9.narrationAr]) || `مرحباً بكم في ${fallbackType.ar} مع تشطيبات فاخرة وإضاءة طبيعية.`,
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
              title: _optionalChain([aiRoom, 'optionalAccess', _10 => _10.featureHotspot, 'optionalAccess', _11 => _11.titleEn]) || 'Luxury Finish',
              titleAr: _optionalChain([aiRoom, 'optionalAccess', _12 => _12.featureHotspot, 'optionalAccess', _13 => _13.titleAr]) || 'تشطيب فاخر',
              type: 'info',
              infoText: _optionalChain([aiRoom, 'optionalAccess', _14 => _14.featureHotspot, 'optionalAccess', _15 => _15.descriptionEn]) || 'Italian imported porcelain and custom architectural lighting.',
              infoTextAr: _optionalChain([aiRoom, 'optionalAccess', _16 => _16.featureHotspot, 'optionalAccess', _17 => _17.descriptionAr]) || 'بورسلين إيطالي فاخر مع إضاءة معمارية مخصصة.'
            }
          ]
        };
      });

      const tourConfig = {
        tourId: `vt-${docId}`,
        unitId: docId,
        unitTitle: _optionalChain([data, 'optionalAccess', _18 => _18.title]) || `Unit ${docId}`,
        defaultRoomId: _optionalChain([rooms, 'access', _19 => _19[0], 'optionalAccess', _20 => _20.id]) || 'room-1',
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
