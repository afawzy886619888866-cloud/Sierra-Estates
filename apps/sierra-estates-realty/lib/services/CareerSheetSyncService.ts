/**
 * CareerSheetSyncService — Real-time synchronization for Career & Employee Applications.
 *
 * Connects:
 *   - Google Sheets (Tab: `Career_Applications` / `Employees_Hiring`)
 *   - Supabase PostgreSQL (`public.career_applications`, `public.applicants` view)
 *   - Admin Intelligence OS (`/admin` -> Requests & Recruitment Online Spreadsheets)
 *   - Local JSON mirror (`data/online-sheet-careers.json`)
 */

import fs from 'fs';
import path from 'path';
import { listRecords } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export interface CareerSheetRow {
  id: string;
  role: 'sales' | 'admin' | string;
  fullName: string;
  phone: string;
  email: string;
  position: string;
  experience: string;
  hasVehicle: boolean;
  biggestAchievements?: string;
  expectedSalary?: string;
  realEstateKnowledge?: string;
  availability?: string;
  cvUrl?: string;
  notes?: string;
  status: 'new' | 'pending_review' | 'reviewed' | 'interview_scheduled' | 'hired' | 'rejected';
  createdAt: string;
  source: string;
}

export interface CareerSyncResult {
  ok: boolean;
  row?: number;
  sheet?: string;
  error?: string;
}

function resolveCareersDataFile(): string {
  const cwd = process.cwd();
  const candidate = path.resolve(cwd, 'data', 'online-sheet-careers.json');
  const dir = path.dirname(candidate);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return candidate;
}

export function loadLocalCareersMirror(): CareerSheetRow[] {
  try {
    const file = resolveCareersDataFile();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    logger.warn('[CAREER_SHEET] Error reading local careers mirror:', err);
  }
  return [];
}

export function saveLocalCareersMirror(rows: CareerSheetRow[]): void {
  try {
    const file = resolveCareersDataFile();
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
  } catch (err) {
    logger.warn('[CAREER_SHEET] Error saving local careers mirror:', err);
  }
}

/**
 * Forward a single candidate application to the Google Apps Script Web App
 * and persist immediately to the local spreadsheet mirror.
 */
export async function syncCareerToSheet(
  careerData: Partial<CareerSheetRow> & { fullName: string; phone: string; position: string },
  timeoutMs = 30_000
): Promise<CareerSyncResult> {
  const now = new Date().toISOString();
  const id = careerData.id || `CAR-${Date.now().toString(36).toUpperCase()}`;

  const fullRow: CareerSheetRow = {
    id,
    role: careerData.role || 'sales',
    fullName: careerData.fullName,
    phone: careerData.phone,
    email: careerData.email || '',
    position: careerData.position,
    experience: careerData.experience || '0',
    hasVehicle: Boolean(careerData.hasVehicle),
    biggestAchievements: careerData.biggestAchievements || '',
    expectedSalary: careerData.expectedSalary || '',
    realEstateKnowledge: careerData.realEstateKnowledge || '',
    availability: careerData.availability || 'Immediately',
    cvUrl: careerData.cvUrl || '',
    notes: careerData.notes || '',
    status: careerData.status || 'pending_review',
    createdAt: careerData.createdAt || now,
    source: careerData.source || 'careers_page',
  };

  // 1. Update local JSON mirror immediately for zero-latency admin UI
  const existingRows = loadLocalCareersMirror();
  const index = existingRows.findIndex((r) => r.id === fullRow.id);
  if (index >= 0) {
    existingRows[index] = { ...existingRows[index], ...fullRow };
  } else {
    existingRows.unshift(fullRow);
  }
  saveLocalCareersMirror(existingRows);

  // 2. Dispatch to Google Apps Script Web App
  const url = process.env.SHEETS_WEBAPP_URL || process.env.WF_SHEET_WRITE_URL;
  const secret =
    process.env.SIERRA_SECRET_KEY ||
    process.env.SHEETS_WEBAPP_SECRET ||
    process.env.WF_SHEET_WRITE_SECRET ||
    'SE_OUTREACH_SECRET_2026_CAIRO';

  if (!url) {
    logger.info('[CAREER_SHEET] SHEETS_WEBAPP_URL not configured — saved to local mirror & DB.');
    return { ok: true, sheet: 'Career_Applications (Local Mirror)' };
  }

  const payload = {
    action: 'career_submission',
    secret,
    tab: 'Career_Applications',
    application: fullRow,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Apps Script responded HTTP ${res.status}`);
    }

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { ok: true, raw: text };
    }

    return {
      ok: true,
      row: json.row,
      sheet: json.sheet || 'Career_Applications',
    };
  } catch (err: any) {
    logger.warn('[CAREER_SHEET] Google Sheet sync dispatch warning:', err.message);
    return { ok: true, error: err.message, sheet: 'Career_Applications (Local Mirror)' };
  }
}

/**
 * Retrieve all unified career & employee applications:
 * Combines Supabase `career_applications` with local spreadsheet mirror.
 */
export async function getCareersSpreadsheetRows(): Promise<CareerSheetRow[]> {
  const mergedMap = new Map<string, CareerSheetRow>();

  // 1. Seed from local JSON mirror
  const localRows = loadLocalCareersMirror();
  for (const r of localRows) {
    mergedMap.set(r.id, r);
  }

  // 2. Load from Supabase `career_applications`
  try {
    const records = await listRecords<Record<string, any>>('career_applications', {
      orderBy: { column: 'createdAt', ascending: false },
      limit: 300,
    });

    for (const rec of records) {
      const id = rec.id || `CAR-${rec.phone}`;
      const existing = mergedMap.get(id);

      const row: CareerSheetRow = {
        id,
        role: rec.role || (rec.position?.toLowerCase().includes('admin') ? 'admin' : 'sales'),
        fullName: rec.name || rec.fullName || 'Candidate',
        phone: rec.phone || '',
        email: rec.email || '',
        position: rec.position || 'Real Estate Consultant',
        experience: rec.experience || '0',
        hasVehicle: Boolean(rec.has_vehicle ?? rec.hasVehicle),
        biggestAchievements: rec.biggest_achievements || rec.biggestAchievements || '',
        expectedSalary: rec.expected_salary || rec.expectedSalary || '',
        realEstateKnowledge: rec.real_estate_knowledge || rec.realEstateKnowledge || '',
        availability: rec.availability || 'Immediately',
        cvUrl: rec.cv_url || rec.cvUrl || '',
        notes: rec.message || rec.notes || '',
        status: (rec.status as any) || 'pending_review',
        createdAt: rec.created_at || rec.createdAt || new Date().toISOString(),
        source: rec.source || 'careers_page',
      };

      mergedMap.set(id, { ...row, ...(existing || {}) });
    }
  } catch (err) {
    logger.warn('[CAREER_SHEET] Supabase read fallback warning:', err);
  }

  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
