'use strict';
/**
 * notice.js — mandatory Cairo Plaza notice policy for server-side workflows.
 *
 * Canonical Arabic text is copied CHARACTER-FOR-CHARACTER from
 * apps/sierra-estates-realty/lib/server/cairo-plaza-notice.ts
 * (source of truth: announcement/DISCLAIMER.txt, verified by
 * announcement/verify_disclaimer.py). Do NOT edit, shorten, translate or
 * paraphrase.
 *
 * Policy mirrors the app drain worker (whatsapp-drain.ts):
 *   - B2B owner-side negotiation threads (purpose 'owner-negotiation') stay
 *     unwrapped — the mandatory notice applies to client-facing marketing
 *     and auto-replies, not broker-to-owner negotiation pings.
 *   - Client-facing marketing purposes ALWAYS carry the notice.
 *   - Any message body that itself mentions Cairo Plaza / المطرية carries
 *     the notice regardless of purpose.
 */

const CAIRO_PLAZA_DISCLAIMER_AR =
  'يتم توقيع العقد وإستلام أصل إستمارة الحجز مختومة بخاتم الشركة وتسليم دفعة التعاقد وإستلام إيصالات السداد من الإدارة المالية الموجودة بالعمارة رقم (1) بالدور الثاني بمشروع كايرو بلازا المطرية. يتم إستلام أصل العقد الموقع من الشركة بحد أقصى (7) أيام عمل من تاريخ توقيع العميل على العقد.';

const NOTICE_LABEL_AR = 'الإشعار الملزم لخطوات الحجز والتعاقد — كايرو بلازا المطرية';

const NOTICE_EXEMPT_PURPOSES = new Set(['owner-negotiation']);
const NOTICE_ALWAYS_PURPOSES = new Set(['campaign-broadcast', 'custom-outreach']);

function mentionsCairoPlaza(text) {
  if (!text) return false;
  const s = String(text).toLowerCase();
  return (
    s.includes('cairo plaza') ||
    s.includes('كايرو بلازا') ||
    s.includes('المطرية') ||
    s.includes('mataria') ||
    s.includes('el-matarya') ||
    s.includes('matarya')
  );
}

function withCairoPlazaNotice(reply) {
  const body = String(reply || '').replace(/\s+$/, '');
  return `${body}\n\n———\n*${NOTICE_LABEL_AR}:*\n${CAIRO_PLAZA_DISCLAIMER_AR}`;
}

/** Purpose-aware wrapper — same decision table as the app drain worker. */
function enforceOutreachNotice(purpose, body) {
  const raw = String(body ?? '');
  if (!raw) return raw;
  if (purpose && NOTICE_EXEMPT_PURPOSES.has(purpose)) return raw;
  if (raw.includes(CAIRO_PLAZA_DISCLAIMER_AR)) return raw; // already wrapped
  if ((purpose && NOTICE_ALWAYS_PURPOSES.has(purpose)) || mentionsCairoPlaza(raw)) {
    return withCairoPlazaNotice(raw);
  }
  return raw;
}

module.exports = {
  CAIRO_PLAZA_DISCLAIMER_AR,
  NOTICE_LABEL_AR,
  mentionsCairoPlaza,
  withCairoPlazaNotice,
  enforceOutreachNotice,
};
