/**
 * SIERRA ESTATES — Shared Zod Schemas & Validation Helpers
 *
 * Central place for request/response schemas used by public API routes.
 * Routes import these instead of inlining z.object(...) so the contract
 * is visible in one place and can be reused by client code.
 *
 * Usage in a route:
 *
 *   import { parseRequestBody, leadCreateSchema } from '@/lib/server/schemas';
 *
 *   const parsed = await parseRequestBody(req, leadCreateSchema);
 *   if (!parsed.success) return parsed.errorResponse;
 *   const lead = parsed.data;
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

// ─── Shared primitives ─────────────────────────────────────────────────────

export const emailSchema = z.string().email('Invalid email address').max(254);
export const phoneSchema = z
  .string()
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .regex(/^[+\d][\d\s\-().]+$/, 'Phone number contains invalid characters');
export const localeSchema = z.enum(['en', 'ar']).optional();
export const isoDateSchema = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid ISO date');

export const currencySchema = z.enum(['EGP', 'USD', 'EUR', 'AED', 'SAR']);

// ─── Public API schemas ────────────────────────────────────────────────────

export const leadCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: emailSchema,
  phone: phoneSchema.optional(),
  message: z.string().max(2000).optional(),
  locale: localeSchema,
});

export const viewingRequestSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required').max(128),
  unitId: z.string().min(1, 'Unit ID is required').max(128),
  portfolioId: z.string().max(128).optional().nullable(),
});

/** Detailed viewing request from the public site (not the CRM internal one). */
export const detailedViewingRequestSchema = z.object({
  propertyCode: z.string().min(1).max(64),
  visitorName: z.string().min(1).max(120),
  visitorEmail: emailSchema,
  visitorPhone: phoneSchema,
  preferredDate: isoDateSchema,
  preferredTime: z.string().max(20).optional(),
  numberOfPeople: z.number().int().min(1).max(20).optional(),
  message: z.string().max(2000).optional(),
});

export const closerInitiateSchema = z.object({
  propertyCode: z.string().min(1).max(64),
  visitorName: z.string().min(1).max(120),
  visitorEmail: emailSchema.optional(),
  visitorPhone: phoneSchema,
});

export const conciergeAnalyzeSchema = z.object({
  text: z.string().min(1, 'Text is required').max(20_000),
});

export const conciergeSendWhatsAppSchema = z.object({
  leadId: z.string().min(1).max(128),
  message: z.string().min(1).max(4096), // WhatsApp single message cap
});

/** GET /api/listings — query params. */
export const listingsQuerySchema = z.object({
  id: z.string().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  compound: z.string().max(120).optional(),
  propertyType: z.string().max(60).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  beds: z.coerce.number().int().min(0).max(20).optional(),
});

/** GET /api/wealth/portfolio — query params. */
export const wealthPortfolioQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(50).default(6),
  // searchParams.get() returns null when absent; preserve that contract.
  market: z.enum(['egypt', 'uae']).nullable().default(null),
});

/** GET /api/whatsapp/heartbeat — no body, but keep for symmetry. */
export const whatsappHeartbeatSchema = z.object({}).optional();

// ─── Semantic search (bilingual, rent-aware) ───────────────────────────────

/**
 * Structured search intent extracted by Gemini from a natural-language query.
 * Accepts Arabic, English, mixed, Arabizi ("3" for "ع"), and Arabic numerals
 * (٣ instead of 3). The model normalizes everything to this shape.
 */
export const searchIntentSchema = z.object({
  /** 'rent' or 'sale'. Defaults to 'rent' if the query mentions "إيجار" / "rent". */
  offerType: z.enum(['rent', 'sale', 'any']).default('any'),
  propertyType: z
    .enum(['apartment', 'villa', 'townhouse', 'duplex', 'penthouse', 'studio', 'chalet', 'commercial', 'land', 'any'])
    .default('any'),
  bedsMin: z.number().int().min(0).max(20).optional(),
  bedsMax: z.number().int().min(0).max(20).optional(),
  bathsMin: z.number().int().min(0).max(20).optional(),
  bathsMax: z.number().int().min(0).max(20).optional(),
  areaMin: z.number().min(0).optional(), // sqm
  areaMax: z.number().min(0).optional(), // sqm
  /** For rentals: monthly rent cap. For sales: total price cap. */
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  currency: z.enum(['EGP', 'USD', 'EUR', 'AED', 'SAR']).default('EGP'),
  /** Free-text compound / district names extracted from the query. */
  compounds: z.array(z.string().max(120)).default([]),
  /** Cairo-area districts (Tagamoa, New Cairo, Sheikh Zayed, etc.) */
  districts: z.array(z.string().max(120)).default([]),
  furnishing: z.enum(['furnished', 'semi-furnished', 'unfurnished', 'any']).default('any'),
  features: z.array(z.string().max(80)).default([]),
  /** Detected language of the query. */
  detectedLocale: z.enum(['en', 'ar']).default('en'),
  /** Free-form notes the model couldn't classify into structured fields. */
  notes: z.string().max(500).optional(),
});

export type SearchIntent = z.infer<typeof searchIntentSchema>;

/** POST /api/search/semantic body. */
export const semanticSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500),
  locale: z.enum(['en', 'ar']).default('en'),
  /** Override the AI-extracted intent (admin tooling). */
  intentOverride: searchIntentSchema.partial().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Helper: parse + standard 400 response ────────────────────────────────

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errorResponse: NextResponse };

/** Type guard that narrows ParseResult to its failure variant. Works with TS 5.9 generic narrowing. */
export function isParseFailure<T>(
  r: ParseResult<T>
): r is { success: false; errorResponse: NextResponse } {
  return !r.success;
}

/**
 * Parse a JSON request body against a Zod schema. On failure, returns a
 * ready-to-send 400 NextResponse with `{ success: false, error, details }`.
 *
 *   const parsed = await parseRequestBody(req, leadCreateSchema);
 *   if (!parsed.success) return parsed.errorResponse;
 *   // parsed.data is now typed as z.infer<typeof leadCreateSchema>
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse URL search params (e.g. from a GET request) against a Zod schema.
 * Coerces strings to numbers/booleans as declared in the schema.
 */
export function parseQueryParams<T>(
  url: URL,
  schema: z.ZodType<T>
): ParseResult<T> {
  const obj: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    obj[key] = value;
  });

  const result = schema.safeParse(obj);
  if (!result.success) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}
