/**
 * SIERRA ESTATES — ASSET ENCODING SERVICE
 * Implements the "Encoding Program" logic for rapid unit registration via copy-paste.
 */

import { GoogleAIService } from '../server/google-ai';
import { Unit } from '../models/schema';
import { generateSierraCode, computeSyncHash } from './coding-algorithm';

export interface EncodedAsset extends Partial<Unit> {
  rawText: string;
  sbrCode?: string;
  sync_hash?: string;
}

/**
 * Parses raw copied listing information into the Sierra Estates Unit schema.
 * Emits canonical sbrCode and sync_hash via deterministic code logic.
 */
export async function encodeListingFromText(rawText: string): Promise<Partial<Unit> & { sbrCode: string; sync_hash: string }> {
  const systemPrompt = `ROLE: You are "Sierra," the Lead Logic Agent for Asset Registration at Sierra Estates.
TASK: Extract structured property details from raw text (WhatsApp, OLX, or PDFs).

EXTRACTION PROTOCOL:
- "title": Professional, luxury title (English).
- "propertyType": One of "apartment", "villa", "townhouse", "duplex", "penthouse", "studio", "chalet", "commercial", "land".
- "status": Default to "available".
- "compound": The community name.
- "area": Size in sqm (number).
- "bedrooms": Number of rooms.
- "bathrooms": Number of bathrooms.
- "price": Total price in EGP (number).
- "finishingType": One of "fully-finished", "semi-finished", "core-shell", "not-finished".
- "description": Concise, luxury description (English).

TONE: Institutional, Precise, Data-Driven.
FORMAT: Return ONLY a JSON object.`;

  try {
    const data = await GoogleAIService.chatCompletions(
      'scribe', 'asset-encoding',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Encode this listing information: ${rawText}` }
      ],
      { model: 'gemini-1.5-flash', temperature: 0.1 }
    );

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Unable to parse encoding results.');

    const parsed = JSON.parse(jsonMatch[0]) as Partial<Unit>;

    // Deterministic JS/TS logic computes sbrCode and sync_hash
    const sbrCode = generateSierraCode({
      compound: parsed.compound || 'Unknown',
      rooms: parsed.bedrooms || 0,
      furnishingStatus: parsed.finishingType?.includes('fully') ? 'F' : 'U',
      price: parsed.price || 0,
    });

    const sync_hash = computeSyncHash({
      compound: parsed.compound,
      area: parsed.area,
      price: parsed.price,
    });

    return {
      ...parsed,
      sbrCode,
      sync_hash,
      code: sbrCode,
    };
  } catch (err) {
    console.error('[AssetEncoding] Extraction error:', err);
    throw err;
  }
}
