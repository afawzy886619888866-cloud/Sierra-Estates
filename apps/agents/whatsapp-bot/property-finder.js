 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * PropertyFinder integration for the WhatsApp bot router.
 *
 * Bridges the Hermes multi-agent pipeline to the client app's real listing
 * inventory. When a client asks about properties, the router enriches the
 * Hermes context with a ranked digest of ACTUAL listings instead of letting
 * the LLM improvise from nothing.
 *
 * Data flow:
 *   1. Fetch live listings from the Sierra Estates client API (/api/listings).
 *   2. Map them to the PropertyMatchmaker's PropertyListing shape.
 *   3. Extract a lightweight client profile from the raw WhatsApp message.
 *   4. Rank listings with PropertyMatchmaker and render a compact text digest.
 */

import { PropertyMatchmaker, } from '@sierra-estates/agents-core'
























const DEFAULT_BASE_URL = 'https://sierra-estates-realty.vercel.app'

/**
 * Resolve the base URL of the client app. Prefer the configured env var;
 * fall back to the deployed site.
 */
function resolveBaseUrl() {
  const env = process.env.NEXT_PUBLIC_CLIENT_URL || process.env.CLIENT_URL || process.env.SIERRA_CLIENT_URL
  if (env) return env.replace(/\/+$/, '')
  return DEFAULT_BASE_URL
}

/**
 * Fetch real listings from the client API. Returns [] on any failure so a
 * data outage never breaks the WhatsApp pipeline.
 */
export async function fetchListings(options = {}) {
  const base = resolveBaseUrl()
  const url = new URL(`${base}/api/listings`)

  if (options.limit) {
    url.searchParams.set('limit', String(options.limit))
    url.searchParams.set('mode', 'sale')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      console.warn('[PropertyFinder] Fetch failed:', res.status, res.statusText)
      return []
    }
    const data = await res.json()

    // Filter mode returns a bare array; legacy envelope mode returns {listings}.
    const list = Array.isArray(data)
      ? (data )
      : _nullishCoalesce(_optionalChain([(data ), 'optionalAccess', _ => _.listings]), () => ( []))
    return list
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[PropertyFinder] Fetch error (continuing without live inventory):', message)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Convert a raw API listing into the PropertyMatchmaker shape.
 * Uses USD total price to stay consistent with the repo's EGP→USD (/50)
 * convention and the client profile extractor below.
 */
function toPropertyListing(r) {
  return {
    id: r.id,
    sierraCode: r.code || r.id,
    title: `${r.type || 'Unit'} · ${r.compound || 'Sierra'}`,
    compound: r.compound || 'New Cairo',
    type: r.type || 'Apartment',
    price: r.usd || 0,
    area_sqm: r.area || 0,
    bedrooms: r.beds || 0,
    finishing: r.zone || '',
    valuationScore: r.aiScore != null ? Math.round(r.aiScore * 10) : undefined,
    features: r.tag ? [r.tag] : undefined,
  }
}

/**
 * Extract a coarse client profile from the raw message so we can rank.
 * Handles simple Arabic + English signals (compound, budget, bedrooms, type).
 */
export function extractClientProfile(message)






 {
  const profile






 = {}

  // Compound / region names (common New Cairo compounds + Arabic transliterations)
  const known = [
    'الشيخ زايد', 'التجمع', 'التجمع الخامس', 'مدينتي', 'مدينتي',
    'الرحاب', 'بالم هيلز', 'بالمهيلز', 'mountain view', 'ماونتن فيو',
    'المستقبل', 'ذا فيو', 'كمبوند', 'mostakbal', 'sheikh zayed', 'new cairo',
    'the view', '5th settlement', 'العبور', 'أكتوبر', 'october', 'القطامية',
  ]
  for (const name of known) {
    if (message.toLowerCase().includes(name)) {
      profile.targetCompound = name
      break
    }
  }

  // Budget: look for a number optionally suffixed by ك / مليون / M / million.
  // Large EGP values are converted to USD via the repo's /50 convention.
  const budgetMatch = message.match(/(\d+(?:\.\d+)?)\s*(مليون|ك|million|m\b|M\b)/i)
  if (budgetMatch) {
    const value = parseFloat(budgetMatch[1])
    if (value > 100) {
      profile.budgetMax = Math.round(value * 1000000 / 50) // EGP millions → USD
    } else {
      profile.budgetMax = Math.round(value * 1000000) // USD millions
    }
  } else {
    const plain = message.match(/(\d{5,})\s*(دولار|جنيه|usd|egp|dollar)/i)
    if (plain) {
      const value = parseFloat(plain[1])
      profile.budgetMax = plain[1].toLowerCase().includes('جنيه') || plain[1].toLowerCase().includes('egp')
        ? Math.round(value / 50)
        : value
    }
  }

  // Bedrooms
  const bedMatch = message.match(/(\d+)\s*(غرف|bedroom|bed|bedrooms)/i)
  if (bedMatch) profile.minBedrooms = parseInt(bedMatch[1], 10)

  // Property type
  if (/(فيلا|villa|villas)/i.test(message)) profile.propertyType = 'villa'
  else if (/(تاون |شاليه|chalet)/i.test(message)) profile.propertyType = 'chalet'
  else if (/(شقة|apartment|flat)/i.test(message)) profile.propertyType = 'apartment'

  // Sale vs rent
  if (/(ايجار|rent|للايجار)/i.test(message)) profile.mode = 'rent'

  return profile
}

/**
 * Build a compact, Hermes-friendly digest of real listings for the requested
 * intent, ranked when a client profile can be derived.
 */
export async function buildListingsDigest(message, intent) {
  const raw = await fetchListings({ limit: 60 })

  if (!raw || raw.length === 0) {
    return { ok: false, count: 0, digest: '', error: 'No live inventory available' }
  }

  const properties = raw.map(toPropertyListing)

  const propertyIntents = [
    'property_search',
    'availability_check',
    'property_inquiry',
    'price_inquiry',
  ]
  const wantRanked = propertyIntents.includes(intent)
  const profile = extractClientProfile(message)

  let selected
  if (wantRanked && Object.keys(profile).length > 0) {
    selected = PropertyMatchmaker.rankProperties(properties, profile, 5).map((r) => r.property)
  } else {
    selected = properties.slice(0, 5)
  }

  const lines = selected.map((p) => {
    const parts = [
      `- ${p.sierraCode || p.id}: ${p.title}`,
      p.bedrooms ? `${p.bedrooms} beds` : null,
      p.area_sqm ? `${p.area_sqm} m²` : null,
      p.price ? `USD ${p.price.toLocaleString('en-US')}` : null,
      p.finishing ? `${p.finishing}` : null,
      _optionalChain([p, 'access', _2 => _2.features, 'optionalAccess', _3 => _3.length]) ? `[${p.features.join(', ')}]` : null,
    ].filter(Boolean)
    return parts.join(' · ')
  })

  const digest = [
    `LIVE INVENTORY (${selected.length} of ${raw.length} listings):`,
    ...lines,
    'Use these REAL properties above. Ground your answer in them. Do not invent properties, codes, or prices not listed here. Present the best matches and ask which ones to pursue.',
  ].join('\n')

  return { ok: true, count: selected.length, digest }
}
