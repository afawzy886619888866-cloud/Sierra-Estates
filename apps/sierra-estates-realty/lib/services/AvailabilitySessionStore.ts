/**
 * AvailabilitySessionStore — the LIGHT session persistence + SLA sweep core.
 *
 * Extracted from AvailabilityVerificationService (2026-11-20 automation
 * enhancement): the cron route /api/cron/check-availability-sla was crashing
 * on Cloudflare's Workers FREE plan (error 1101/503, intermittent) because
 * statically importing the service also pulled `@google/generative-ai`, the
 * WhatsApp sender, viewing-engine — and statically `import`ing the 6.7 MB
 * lib/inventory/snapshot.json, whose cold-start JSON.parse blows the 10 ms
 * CPU cap before the sweep even runs.
 *
 * This module has deliberately LIGHT dependencies only (@sierra-estates/
 * memory-engine + a dynamic import of @sierra-estates/db): the sweep is a
 * pure timeout pass over the stored sessions. The interactive service
 * (Gemini analysis, WhatsApp, snapshot lookups) delegates session I/O here,
 * so both paths share ONE persistence contract and the SAME store key.
 */

import { logger } from '@/lib/logger';
import { sharedMemory } from '@sierra-estates/memory-engine';

export const SESSIONS_STORE_KEY = 'availability_batch_sessions';

export interface VerificationUnitItem {
  unitId: string;
  unitCode: string;
  compound: string;
  propertyType: string;
  operation: 'rent' | 'buy' | string;
  priceLabel: string;
  price: number;
  contactPhone: string;
  contactName: string;
  ownerType: 'owner' | 'broker' | 'unknown';
  status: 'inquiry_sent' | 'no_contact_on_file' | 'available' | 'unavailable' | 'expired';
  sentAt: number;
  expiresAt: number;
  replyReceivedAt?: number;
  refinedNotes?: string;
  photoUrls: string[];
  rawReplyText?: string;
}

export interface BatchAvailabilitySession {
  id: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
  createdAt: number;
  expiresAt: number; // 1 hour after createdAt
  status: 'active' | 'completed' | 'expired';
  units: VerificationUnitItem[];
  viewingProposed: boolean;
  viewingScheduled: boolean;
  scheduledViewingId?: string;
}

/** Helper to fetch all sessions from shared memory (never throws). */
export async function getSessions(): Promise<Record<string, BatchAvailabilitySession>> {
  try {
    const stored = await sharedMemory.read(SESSIONS_STORE_KEY);
    return (stored as Record<string, BatchAvailabilitySession>) || {};
  } catch {
    return {};
  }
}

/**
 * Helper to persist sessions to shared memory + Supabase (fail-soft —
 * persistence problems are logged, never raised into the caller).
 */
export async function saveSessions(sessions: Record<string, BatchAvailabilitySession>): Promise<void> {
  try {
    await sharedMemory.write(SESSIONS_STORE_KEY, sessions, {
      author: 'system',
      tags: ['availability', 'radar-net'],
    });
  } catch (err) {
    logger.warn(`[AvailabilityService] Failed to persist sessions to sharedMemory: ${(err as Error).message}`);
  }

  // Authoritative persistence in Supabase PostgreSQL
  try {
    const { getSupabaseAdmin } = await import('@sierra-estates/db');
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from('unified_memory').upsert({
        agent_id: 'system',
        category: 'radar-net',
        key: SESSIONS_STORE_KEY,
        value: sessions,
        source: 'AvailabilityVerificationService',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id,key' });

      for (const s of Object.values(sessions).slice(-10)) {
        await supabase.from('inquiries').upsert({
          id: s.id,
          mode: 'radar-net-availability',
          name: s.clientName,
          phone: s.clientPhone,
          zone: s.units[0]?.compound || '',
          property_type: s.units[0]?.propertyType || '',
          budget: `${s.units.length} units selected (max 40)`,
          status: s.status === 'active' ? 'inquiry_sent' : s.status,
          source: 'listing-net-radar',
          notes: `Availability verification for ${s.units.length} units. Notes: ${s.notes || 'None'}`,
          updated_by: 'AvailabilityVerificationService',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    }
  } catch (dbErr) {
    logger.warn(`[AvailabilityService] Supabase sync note: ${(dbErr as Error).message}`);
  }
}

/**
 * SLA sweep — pure timeout pass over active sessions. Units whose owner
 * reply deadline elapsed flip to 'unavailable'; sessions with no pending
 * units complete. Touches nothing but sessions (CPU-light by design: must
 * fit Cloudflare's FREE-plan 10 ms cold-start budget).
 */
export async function sweepTimeouts(): Promise<{ expiredUnitsCount: number; updatedSessions: number }> {
  const sessions = await getSessions();
  const now = Date.now();
  let expiredUnitsCount = 0;
  let updatedSessions = 0;

  for (const sessionId of Object.keys(sessions)) {
    const session = sessions[sessionId];
    if (session.status !== 'active') continue;

    let sessionModified = false;
    let allSettled = true;

    for (const unit of session.units) {
      if (unit.status === 'inquiry_sent') {
        if (now >= unit.expiresAt) {
          unit.status = 'unavailable';
          unit.refinedNotes = 'غير متاحة (لم يتم الرد من جهة الاتصال خلال مهلة الساعة)';
          expiredUnitsCount++;
          sessionModified = true;
        } else {
          allSettled = false;
        }
      }
    }

    if (allSettled) {
      session.status = 'completed';
      sessionModified = true;
    }

    if (sessionModified) {
      updatedSessions++;
    }
  }

  if (updatedSessions > 0) {
    await saveSessions(sessions);
  }

  return { expiredUnitsCount, updatedSessions };
}
