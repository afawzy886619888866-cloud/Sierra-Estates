'use server';

/**
 * SIERRA ESTATES — CAREER APPLICATION SERVER ACTION (Module 3)
 *
 * React 19 `useActionState` action behind the /careers interactive
 * application form. Zod validation, optional CV upload to Supabase Storage
 * (`career-applications` bucket), dual write to Supabase
 * (public.career_applications) + Google Sheets `Careers_Applicants` tab
 * (Sheets API v4, tab + scorecard header auto-created), and an instant
 * Telegram HR alert per applicant.
 */

import { z } from 'zod';
import { insertRecord, updateRecord } from '@sierra-estates/db';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';
import {
  SHEET_TABS,
  SHEET_HEADERS,
  appendToManagedTab,
} from '@/lib/services/GoogleSheetsV4Service';
import {
  sendTelegramNotification,
  formatCareerApplicantMessage,
} from '@/lib/services/TelegramNotifier';
import { logger } from '@/lib/logger';

export interface CareerFormState {
  status: 'idle' | 'success' | 'error';
  message: string;
  fieldErrors?: Record<string, string>;
  appId?: string;
}

export const initialCareerFormState: CareerFormState = { status: 'idle', message: '' };

/** The three open roles on the /careers page (single source of truth). */
export const CAREER_ROLES = [
  {
    id: 'online-real-estate-consultant',
    title: 'Online Real Estate Consultant',
    workMode: 'Online' as const,
    track: 'sales',
    summary:
      'Remote advisory role: run AI-matched buyer/tenant requests, host virtual tours, and close New Cairo deals from anywhere.',
  },
  {
    id: 'in-office-senior-property-advisor',
    title: 'In-Office Senior Property Advisor (Fifth Settlement)',
    workMode: 'In-Office' as const,
    track: 'sales',
    summary:
      'Senior advisory seat at our Fifth Settlement HQ: lead high-value site tours, mentor juniors, and own the compound relationships.',
  },
  {
    id: 'proptech-inventory-operations-specialist',
    title: 'PropTech & Inventory Operations Specialist',
    workMode: 'In-Office' as const,
    track: 'operations',
    summary:
      'Own the inventory OS: unit coding, deduplication, Google Sheets / Supabase sync health, and the automation workflows behind every listing.',
  },
] as const;

export type CareerRoleTitle = (typeof CAREER_ROLES)[number]['title'];

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(120),
  phone: z
    .string()
    .trim()
    .min(8, 'Phone number is required.')
    .max(20)
    .refine((v) => normalizeEgyptianPhone(v) !== null, {
      message: 'Enter a valid Egyptian mobile (e.g. 01012345678).',
    }),
  email: z.string().trim().email('Enter a valid email address.').max(200),
  role: z.string().trim().min(2, 'Select the role you are applying for.').max(160),
  workMode: z.enum(['Online', 'In-Office'], { message: 'Select a work mode.' }),
  experienceYears: z.coerce
    .number({ message: 'Enter your years of New Cairo real estate experience.' })
    .min(0, 'Experience cannot be negative.')
    .max(50, 'Please enter a realistic number of years.'),
  brokerage: z.string().trim().max(160).optional(),
  cvUrl: z.union([z.string().trim().url('CV link must start with http:// or https://').max(500), z.literal('')]).optional(),
  pitch: z.string().trim().min(10, 'Tell us briefly why you are a strong fit (at least 10 characters).').max(2000),
});

export type CareerApplicationData = z.infer<typeof applicationSchema>;

/* ------------------------------------------------------------------ */
/*  CV UPLOAD (Supabase Storage)                                       */
/* ------------------------------------------------------------------ */

const CV_MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const CV_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

async function uploadCvToStorage(
  applicantName: string,
  file: File,
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  if (file.size > CV_MAX_BYTES) return { ok: false, error: 'CV file must be 4 MB or smaller.' };
  if (file.type && !CV_ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: 'CV must be a PDF or Word document.' };
  }

  try {
    const { getSupabaseAdmin } = await import('@sierra-estates/db');
    const supabase = getSupabaseAdmin();
    const safeName = applicantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'applicant';
    const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `cv/${safeName}-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from('career-applications')
      .upload(path, buffer, { contentType: file.type || 'application/pdf', upsert: false });
    if (error) {
      logger.error(`[careers/apply] CV upload failed: ${error.message}`);
      return { ok: false, error: 'CV upload failed — please try again or paste a CV link instead.' };
    }
    const { data } = supabase.storage.from('career-applications').getPublicUrl(path);
    return { ok: true, path, publicUrl: data.publicUrl };
  } catch (err) {
    logger.error(`[careers/apply] CV upload error: ${err instanceof Error ? err.message : err}`);
    return { ok: false, error: 'CV upload failed — please try again or paste a CV link instead.' };
  }
}

/* ------------------------------------------------------------------ */
/*  MAIN ACTION                                                        */
/* ------------------------------------------------------------------ */

export async function submitCareerApplication(
  _prev: CareerFormState,
  formData: FormData,
): Promise<CareerFormState> {
  const file = formData.get('cvFile');
  const hasFile = file instanceof File && file.size > 0;

  const raw = {
    fullName: String(formData.get('fullName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? ''),
    workMode: String(formData.get('workMode') ?? ''),
    experienceYears: String(formData.get('experienceYears') ?? ''),
    brokerage: String(formData.get('brokerage') ?? ''),
    cvUrl: String(formData.get('cvUrl') ?? ''),
    pitch: String(formData.get('pitch') ?? ''),
  };

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', message: 'Please review the highlighted fields.', fieldErrors };
  }

  const data = parsed.data;
  const phoneNormalized = normalizeEgyptianPhone(data.phone)!;

  // Optional CV file upload → Supabase Storage (career-applications bucket).
  let cvLink = data.cvUrl?.trim() || '';
  let cvFilePath = '';
  if (hasFile) {
    const uploaded = await uploadCvToStorage(data.fullName, file as File);
    if (!uploaded.ok) {
      return { status: 'error', message: uploaded.error, fieldErrors: { cvFile: uploaded.error } };
    }
    cvLink = uploaded.publicUrl;
    cvFilePath = uploaded.path;
  }

  // 1. Supabase — system of record.
  let appId = '';
  try {
    const inserted = await insertRecord<{ id: string }>('career_applications', {
      name: data.fullName,
      phone: phoneNormalized,
      email: data.email,
      position: data.role,
      roleApplied: data.role,
      workMode: data.workMode,
      experienceYears: data.experienceYears,
      experience: `${data.experienceYears} yrs New Cairo real estate`,
      brokerage: data.brokerage || null,
      cvUrl: cvLink || null,
      cvFilePath: cvFilePath || null,
      stage: 'New',
      status: 'new',
      stageNotes: data.pitch,
      message: data.pitch,
      source: 'careers_page',
      createdAt: new Date().toISOString(),
    });
    appId = inserted.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[careers/apply] Supabase write failed: ${message}`);
    return {
      status: 'error',
      message: 'We could not submit your application right now. Please try again shortly.',
    };
  }

  // 2. Google Sheets `Careers_Applicants` (scorecard columns, tab
  //    auto-created). App_ID is the sheet key.
  const appCode = `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${appId.slice(0, 8).toUpperCase()}`;
  const sheetSync = await appendToManagedTab({
    tab: SHEET_TABS.careersApplicants,
    headers: SHEET_HEADERS.careersApplicants,
    values: [
      appCode,
      new Date().toISOString(),
      data.fullName,
      phoneNormalized,
      data.email,
      data.role,
      data.workMode,
      data.experienceYears,
      data.brokerage ?? '',
      cvLink,
      '', // Scorecard_Rating — filled by HR during screening
      'New',
      data.pitch.slice(0, 1000),
    ],
  });
  if (sheetSync.ok) {
    try {
      await updateRecord('career_applications', appId, {
        sheetSyncedAt: new Date().toISOString(),
      });
    } catch {
      /* informational stamp only */
    }
  }

  // 3. Instant Telegram HR alert.
  const telegram = await sendTelegramNotification(
    formatCareerApplicantMessage({
      appId: appCode,
      fullName: data.fullName,
      phone: phoneNormalized,
      email: data.email,
      role: data.role,
      workMode: data.workMode,
      experienceYears: data.experienceYears,
      brokerage: data.brokerage || null,
      cvLink: cvLink || null,
      pitch: data.pitch,
    }),
    { role: 'hr' },
  );
  if (!telegram.ok) {
    // Non-fatal for the applicant — the application is already persisted.
    logger.warn(`[careers/apply] Telegram HR alert skipped: ${telegram.error}`);
  }

  return {
    status: 'success',
    appId: appCode,
    message: `Application received — your reference is ${appCode}. Our HR team reviews every application within 48 hours.`,
  };
}
