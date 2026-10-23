/**
 * MANDATORY Cairo Plaza Booking & Contracting notice — shared helper.
 *
 * Canonical text lives in `announcement/DISCLAIMER.txt` (repo root) and is
 * verified character-for-character by `announcement/verify_disclaimer.py`.
 * Do NOT edit, shorten, translate or paraphrase the Arabic text below.
 *
 * Usage: every auto-reply that mentions (or is prompted by a message that
 * mentions) Cairo Plaza El-Mataria must carry the notice at the end —
 * see app/api/webhooks/whatsapp/route.ts.
 */

export const CAIRO_PLAZA_DISCLAIMER_AR =
  'يتم توقيع العقد وإستلام أصل إستمارة الحجز مختومة بخاتم الشركة وتسليم دفعة التعاقد وإستلام إيصالات السداد من الإدارة المالية الموجودة بالعمارة رقم (1) بالدور الثاني بمشروع كايرو بلازا المطرية. يتم إستلام أصل العقد الموقع من الشركة بحد أقصى (7) أيام عمل من تاريخ توقيع العميل على العقد.';

const NOTICE_LABEL_AR = 'الإشعار الملزم لخطوات الحجز والتعاقد — كايرو بلازا المطرية';

/** Project mention evidence, Arabic and English variants. */
export function mentionsCairoPlaza(text: string | null | undefined): boolean {
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

/** Append the mandatory notice (bottom, visually separated) to a reply. */
export function withCairoPlazaNotice(reply: string): string {
  const body = reply.replace(/\s+$/, '');
  return `${body}\n\n———\n*${NOTICE_LABEL_AR}:*\n${CAIRO_PLAZA_DISCLAIMER_AR}`;
}
