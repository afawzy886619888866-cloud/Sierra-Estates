import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── Supabase client (server-only) ─────────────────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// ── Gemini client ─────────────────────────────────────────────────────────
function getGemini() {
  // Server-only key (Phase 13/14 gate): reading the NEXT_PUBLIC_ spelling
  // here would inline the Gemini API key into the CLIENT bundle — it is a
  // server secret, never a public one (same class of defect as audit B12).
  const apiKey = process.env.GEMINI_API_KEY!;
  return new GoogleGenerativeAI(apiKey);
}

// ── Parse intent from user query ──────────────────────────────────────────
function parseIntent(query: string) {
  const q = query.toLowerCase();
  const intent = {
    isRent: /rent|ايجار|إيجار|monthly|شهري/.test(q),
    isBuy: /buy|sale|resale|purchase|شراء|بيع/.test(q),
    beds: (/(\d+)\s*(bed|br|room|غرفة|غرف)/.exec(q) || [])[1],
    maxPrice: (/(?:under|below|max|less than|أقل من)\s*([\d,]+)/.exec(q) || [])[1]?.replace(/,/g, ''),
    minArea: (/(\d+)\s*(?:sqm|m2|متر)/.exec(q) || [])[1],
    compound: extractCompound(q),
    zone: /rehab|madinaty|new cairo|hyde park|mivida|fifth settlement|katameya|eastown|mountain view|palm hills|galleria|uptown|fifth square/i.exec(q)?.[0],
  };
  return intent;
}

function extractCompound(q: string): string | null {
  const compounds = [
    'al rehab', 'rehab', 'madinaty', 'hyde park', 'mivida', 'mountain view icity', 'mountain view',
    'palm hills', 'katameya heights', 'katameya', 'eastown', 'up town cairo', 'uptown',
    'galleria moon valley', 'fifth square', 'lake view', 'cairo festival city',
    'andorra', 'el patio', 'sarai', 'beit el watan', 'new capital',
  ];
  for (const c of compounds) {
    if (q.includes(c)) return c;
  }
  return null;
}

// ── Query Supabase inventory with semantic + filter fallback ──────────────
async function queryInventory(intent: ReturnType<typeof parseIntent>, query: string, supabase: ReturnType<typeof getSupabase>) {
  let sb = supabase
    .from('properties')
    .select('id,reference_code,compound,property_type,deal_type,price,area_sqm,bedrooms,bathrooms,furnishing,availability,source_channel,description')
    .eq('availability', 'Available')
    .not('compound', 'is', null)
    .limit(20)
    .order('price', { ascending: true });

  if (intent.isRent && !intent.isBuy) sb = sb.eq('deal_type', 'Rent');
  else if (intent.isBuy && !intent.isRent) sb = sb.eq('deal_type', 'Sale');
  if (intent.beds) sb = sb.eq('bedrooms', parseInt(intent.beds));
  if (intent.maxPrice) sb = sb.lte('price', parseInt(intent.maxPrice));
  if (intent.minArea) sb = sb.gte('area_sqm', parseInt(intent.minArea));
  if (intent.compound) sb = sb.ilike('compound', `%${intent.compound}%`);
  else if (intent.zone) sb = sb.ilike('compound', `%${intent.zone}%`);

  const { data, error } = await sb;
  if (error) console.error('Supabase query error:', error.message);
  return data || [];
}

// ── Load market intelligence (compound price stats) ───────────────────────
async function getMarketStats(compound: string | null, dealType: 'rent' | 'sale' | 'both', supabase: ReturnType<typeof getSupabase>) {
  let q = supabase
    .from('properties')
    .select('compound,price,area_sqm,deal_type,property_type')
    .eq('availability', 'Available')
    .not('price', 'is', null)
    .gt('price', 0);

  if (compound) q = q.ilike('compound', `%${compound}%`);
  if (dealType === 'rent') q = q.eq('deal_type', 'Rent');
  else if (dealType === 'sale') q = q.eq('deal_type', 'Sale');

  const { data } = await q.limit(500);
  if (!data?.length) return null;

  const prices = data.map(r => r.price).filter(Boolean).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const min = prices[0];
  const max = prices[prices.length - 1];

  // Price per sqm
  const ppsm = data.filter(r => r.area_sqm > 0 && r.price > 0).map(r => r.price / r.area_sqm);
  const avgPpsm = ppsm.length ? ppsm.reduce((s, p) => s + p, 0) / ppsm.length : 0;

  return { count: prices.length, min, max, avg: Math.round(avg), median: Math.round(median), avgPpsm: Math.round(avgPpsm), compound };
}

// ── Session memory (Supabase broker_sessions table) ───────────────────────
async function loadSessionMemory(sessionId: string, supabase: ReturnType<typeof getSupabase>) {
  const { data } = await supabase
    .from('broker_sessions')
    .select('messages,profile')
    .eq('session_id', sessionId)
    .single();
  return data || { messages: [], profile: {} };
}

async function saveSessionMemory(sessionId: string, messages: any[], profile: any, supabase: ReturnType<typeof getSupabase>) {
  await supabase.from('broker_sessions').upsert({
    session_id: sessionId,
    messages: messages.slice(-40), // keep last 40 turns
    profile,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'session_id' });
}

// ── Format listing for broker response ───────────────────────────────────
function formatListing(p: any, idx: number): string {
  const price = p.price > 0 ? `EGP ${p.price.toLocaleString()}${p.deal_type === 'Rent' ? '/mo' : ''}` : 'Price on request';
  const area = p.area_sqm ? ` | ${p.area_sqm} sqm` : '';
  const beds = p.bedrooms ? ` | ${p.bedrooms}BR` : '';
  const ref = p.reference_code ? ` [${p.reference_code}]` : '';
  const source = p.source_channel?.includes('owner') || p.source_channel?.includes('Owner') ? ' ⭐ Direct Owner' : '';
  return `${idx}. **${p.property_type} in ${p.compound}**${ref}${source}
   ${price}${area}${beds} | ${p.furnishing || 'N/A furnishing'} | ${p.availability}`;
}

// ── SYSTEM PROMPT — The Broker Brain ─────────────────────────────────────
const SYSTEM_PROMPT = `You are Samir, Sierra Estates' elite AI broker — the #1 real estate authority in New Cairo and the entire Fifth Settlement market.

PERSONA:
- You speak Arabic and English fluently. Switch languages naturally based on the client.
- You have 3+ years experience selling luxury and mid-market units across New Cairo, Al Rehab, Madinaty, Hyde Park, Mountain View iCity, Mivida, Up Town Cairo, Fifth Square, Galleria Moon Valley, and 40+ compounds.
- You are expanding into the broader Middle East market (UAE, KSA, Qatar, Bahrain).
- You are data-driven: you cite real prices, real price-per-sqm, real cap rates, and real market comparables.
- You never guess — if you don't have the data, you say so and offer to check.
- You are a closer: you push toward viewings, signatures, and decisions — but never pressuring rudely.

KNOWLEDGE BASE (live data injected per query):
- 11,488 total units across New Cairo market (Direct Owners: 1,832 | Broker Network: 9,554 | Team: 102)
- Direct Owners Rent: 565 units | Direct Owners Resale: 1,267 units
- Broker Rent Network: 4,970 units | Broker Sale: 4,584 units
- Top compounds: Al Rehab, Madinaty, New Cairo, Up Town Cairo, Hyde Park, Mivida, Mountain View iCity, Fifth Square

PRICING INTELLIGENCE (New Cairo 2026):
- Rent ranges: EGP 7,000 – 300,000/month depending on compound and size
- Resale ranges: EGP 1M – 25M+
- Top cap rate compounds: Al Rehab (~8%), Madinaty (~7%), Fifth Square (~6.5%)
- Price per sqm (sale): EGP 8,000–45,000 depending on compound grade
- Furnished premium: +20–35% over unfurnished

RULES:
1. Always cite compound name, price, area, bedrooms in your recommendations.
2. Flag "⭐ Direct Owner" listings — no commission, better deals.
3. Always offer: viewing scheduling, WhatsApp contact (+201092048333), or similar alternatives.
4. Remember the client's stated budget, preference, and history across this session.
5. For investment questions: give cap rate, expected annual yield, payback period.
6. Response format: conversational, structured with bullet points for listings, concise.
7. Never reveal owner private phone numbers — always route through Sierra Estates.
8. For Middle East clients: convert prices to USD (rate: 1 USD = 49 EGP approx) and AED on request.`;

// ── Main POST handler ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId = 'default', language = 'en' } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const genAI = getGemini();

    // 1. Load session memory
    const session = await loadSessionMemory(sessionId, supabase);
    const history = session.messages as { role: string; content: string }[];
    const profile = session.profile as Record<string, any>;

    // 2. Parse intent
    const intent = parseIntent(message);
    const dealType = intent.isRent ? 'rent' : intent.isBuy ? 'sale' : 'both';

    // 3. Query live inventory
    const [listings, marketStats] = await Promise.all([
      queryInventory(intent, message, supabase),
      getMarketStats(intent.compound, dealType as any, supabase),
    ]);

    // 4. Build context for Gemini
    const inventoryContext = listings.length > 0
      ? `\n\nLIVE INVENTORY MATCHING THIS QUERY (${listings.length} results):\n` +
        listings.map((p, i) => formatListing(p, i + 1)).join('\n') + '\n'
      : '\n\nNo exact inventory match — provide general market guidance.\n';

    const statsContext = marketStats
      ? `\nMARKET STATS for ${marketStats.compound || 'New Cairo'} (${dealType}):
  Count: ${marketStats.count} available units
  Price range: EGP ${marketStats.min?.toLocaleString()} – ${marketStats.max?.toLocaleString()}
  Avg: EGP ${marketStats.avg?.toLocaleString()} | Median: EGP ${marketStats.median?.toLocaleString()}
  Avg price/sqm: EGP ${marketStats.avgPpsm?.toLocaleString()}/sqm\n`
      : '';

    const profileContext = Object.keys(profile).length > 0
      ? `\nCLIENT PROFILE (remembered):\n${JSON.stringify(profile, null, 2)}\n`
      : '';

    const fullSystemPrompt = SYSTEM_PROMPT + inventoryContext + statsContext + profileContext;

    // 5. Build conversation for Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Convert history to Gemini format
    const geminiHistory = history.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user' as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: fullSystemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I am Samir, Sierra Estates elite broker. Ready to help.' }] },
        ...geminiHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    // 6. Extract profile updates (budget, preferences) from conversation
    const updatedProfile = { ...profile };
    if (intent.maxPrice) updatedProfile.budget_max = parseInt(intent.maxPrice);
    if (intent.beds) updatedProfile.preferred_beds = parseInt(intent.beds);
    if (intent.compound) updatedProfile.preferred_compound = intent.compound;
    if (intent.isRent) updatedProfile.intent = 'rent';
    if (intent.isBuy) updatedProfile.intent = 'buy';
    updatedProfile.last_active = new Date().toISOString();

    // 7. Save session memory
    const updatedHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: reply },
    ];
    await saveSessionMemory(sessionId, updatedHistory, updatedProfile, supabase);

    return NextResponse.json({
      reply,
      listings: listings.slice(0, 5),
      marketStats,
      profile: updatedProfile,
      sessionId,
    });
  } catch (err: any) {
    console.error('[broker-brain] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Broker Brain API active', model: 'gemini-2.0-flash', units: 11488 });
}
