 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — ASSET ENCODING SERVICE
 * Implements the "Encoding Program" logic for rapid unit registration via copy-paste.
 */

import { GoogleAIService } from '../server/google-ai';

import { generateSierraCode, computeSyncHash } from './coding-algorithm';







/**
 * Parses raw copied listing information into the Sierra Estates Unit schema.
 * Emits canonical sbrCode and sync_hash via deterministic code logic.
 */
export async function encodeListingFromText(rawText) {
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

    const parsed = JSON.parse(jsonMatch[0]) ;

    // Deterministic JS/TS logic computes sbrCode and sync_hash
    const sbrCode = generateSierraCode({
      compound: parsed.compound || 'Unknown',
      rooms: parsed.bedrooms || 0,
      furnishingStatus: _optionalChain([parsed, 'access', _ => _.finishingType, 'optionalAccess', _2 => _2.includes, 'call', _3 => _3('fully')]) ? 'F' : 'U',
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
