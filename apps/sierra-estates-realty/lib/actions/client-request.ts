'use server';

/**
 * SIERRA ESTATES — CLIENT REQUEST SERVER ACTION (Module 2)
 *
 * Progressive-enhancement submit for the /request & /add-request forms via
 * React 19 `useActionState`. Validation with Zod, then the single pipeline:
 * phone normalization → inventory matcher → Supabase + Google Sheets
 * dual-write → Telegram sales-lane alert.
 *
 * The legacy fetch('/api/inquiries') path remains as a no-JS fallback; both
 * surfaces converge on lib/services/ClientRequestPipeline.ts.
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  processClientRequest,
  type ClientRequestPipelineResult,
  type MatchedUnitSummary,
} from '@/lib/services/ClientRequestPipeline';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';

export interface ClientRequestFormState {
  status: 'idle' | 'success' | 'error';
  message: string;
  fieldErrors?: Record<string, string>;
  requestCode?: string;
  matchedUnits?: MatchedUnitSummary[];
}

export const initialClientRequestState: ClientRequestFormState = { status: 'idle', message: '' };

const clientRequestSchema = z.object({
  clientName: z.string().trim().min(2, 'Please enter your full name.').max(120),
  phone: z
    .string()
    .trim()
    .min(8, 'Phone number is required.')
    .max(20)
    .refine((v) => normalizeEgyptianPhone(v) !== null, {
      message: 'Enter a valid Egyptian mobile (e.g. 01012345678).',
    }),
  email: z.union([z.string().trim().email('Enter a valid email address.').max(200), z.literal('')]).optional(),
  transactionType: z.enum(['Sale', 'Rent', 'Primary', 'Advisory']),
  propertyType: z.string().trim().max(80).optional(),
  compoundZone: z.string().trim().max(240).optional(),
  budgetEgp: z.coerce.number().min(0).max(1_000_000_000).optional(),
  areaSqm: z.coerce.number().min(0).max(100_000).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  promoApplied: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type ClientRequestFormData = z.infer<typeof clientRequestSchema>;

export async function submitClientRequest(
  _prev: ClientRequestFormState,
  formData: FormData,
): Promise<ClientRequestFormState> {
  const raw = {
    clientName: String(formData.get('clientName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    transactionType: String(formData.get('transactionType') ?? ''),
    propertyType: String(formData.get('propertyType') ?? ''),
    compoundZone: String(formData.get('compoundZone') ?? ''),
    budgetEgp: formData.get('budgetEgp') ? Number(formData.get('budgetEgp')) : undefined,
    areaSqm: formData.get('areaSqm') ? Number(formData.get('areaSqm')) : undefined,
    bedrooms: formData.get('bedrooms') ? Number(formData.get('bedrooms')) : undefined,
    promoApplied: String(formData.get('promoApplied') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  };

  const parsed = clientRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', message: 'Please review the highlighted fields.', fieldErrors };
  }

  const data = parsed.data;
  const result: ClientRequestPipelineResult = await processClientRequest({
    clientName: data.clientName,
    phone: data.phone,
    email: data.email || null,
    transactionType: data.transactionType,
    propertyType: data.propertyType || null,
    compoundZone: data.compoundZone || null,
    budgetEgp: data.budgetEgp ?? null,
    areaSqm: data.areaSqm ?? null,
    bedrooms: data.bedrooms ?? null,
    promoApplied: data.promoApplied || null,
    notes: data.notes || null,
    source: 'website',
  });

  if (!result.ok) {
    return {
      status: 'error',
      message:
        result.error === 'invalid_phone'
          ? 'Enter a valid Egyptian mobile number (e.g. 01012345678).'
          : 'We could not submit your request right now. Please try again or reach us on WhatsApp.',
    };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/leads');

  return {
    status: 'success',
    message: `Request received — your reference is ${result.requestCode}. A senior advisor will contact you shortly.`,
    requestCode: result.requestCode,
    matchedUnits: result.matchedUnits,
  };
}
