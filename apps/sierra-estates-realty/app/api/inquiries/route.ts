import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertRecord } from '@sierra-estates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inquirySchema = z.object({
  mode: z.enum(['sale', 'rent']).default('sale'),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  zone: z.string().trim().max(120).optional().default(''),
  type: z.string().trim().max(80).optional().default(''),
  budget: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
});

export async function POST(request: Request) {
  if (request.headers.get('content-length') && Number(request.headers.get('content-length')) > 24_000) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please provide a valid name and phone number.' },
      { status: 400 }
    );
  }

  // `type` is the column name in public.inquiries' TypeScript model
  // (`propertyType`); everything else maps 1:1.
  const { type, ...rest } = parsed.data;
  const payload = {
    ...rest,
    propertyType: type,
    source: 'website',
    status: 'S1_NEW_LEAD',
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await insertRecord<{ id: string }>('inquiries', payload);
    return NextResponse.json({ id: created.id, status: 'received' });
  } catch (error) {
    console.error('[inquiries] Supabase write failed:', error);
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ id: `local-${crypto.randomUUID()}`, fallback: true });
    }
    return NextResponse.json(
      { error: 'Unable to save your request right now. Please try again shortly.' },
      { status: 503 }
    );
  }
}
