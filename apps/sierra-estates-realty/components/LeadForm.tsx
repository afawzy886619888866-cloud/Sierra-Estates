'use client';

/**
 * SIERRA ESTATES — LEAD CAPTURE FORM (public advisory intake)
 *
 * Direct-write component for the demand funnel: POSTs to /api/leads, which
 * inserts into Supabase public.leads (the CRM the pipeline board and the
 * matchmaker work on) with instant user feedback — inline validation,
 * submitting state, honest error banners and a success confirmation.
 *
 * The submit maps the visitor's intent onto the canonical lead record:
 * channel 'web', phase 'acquisition', intent → mode (sale|rent), the brief
 * into summary notes. Verified by the /admin/leads console within seconds of
 * submission (leads are Realtime-streamed to the pipeline board).
 *
 * Styling: the vc-* classes of the verified-collection section stylesheet
 * (app/site-styles/verified-collection.css), imported by the mounting page —
 * the site's public surfaces do not run Tailwind by design (see PRODUCT.md).
 */
import React, { useState } from 'react';
import { CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react';

type Intent = 'buy' | 'rent' | 'sell';

export default function LeadForm({
  locale = 'en',
  source = 'portal_advisory',
}: {
  locale?: 'en' | 'ar';
  source?: string;
}) {
  const isAr = locale === 'ar';
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    intent: 'buy' as Intent,
    budget: '',
    zone: '',
    type: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          intent: form.intent,
          budget: form.budget || undefined,
          zone: form.zone || undefined,
          type: form.type || undefined,
          message: form.message || undefined,
          locale,
          source,
        }),
      });
      const json = (await res.json().catch(() => ({
        success: false,
        error: 'Unexpected server response.',
      }))) as { success?: boolean; error?: string; leadId?: string };

      if (!res.ok || !json.success) {
        setSubmitError(
          json.error ||
            (isAr ? 'حدث خطأ. يرجى المحاولة لاحقاً.' : 'Submission failed. Please try again.'),
        );
        return;
      }
      setIsSent(true);
    } catch {
      setSubmitError(
        isAr
          ? 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.'
          : 'Network error. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className="vc-form-success" role="status">
        <CheckCircle2 className="vc-form-success-icon" aria-hidden />
        <div>
          <p className="vc-form-success-title">
            {isAr ? 'تم استلام طلبك' : 'Your request is with our advisory desk'}
          </p>
          <p className="vc-form-success-sub">
            {isAr
              ? 'سيتواصل معك مستشار عقاري خلال ساعات العمل — خطتك القادمة جاهزة بالفعل في لوحة السيّر.'
              : 'A private advisor will reach out during business hours — your brief is already on the Sierra concierge board.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="vc-lead-form" onSubmit={handleSubmit} noValidate>
      <div className="vc-form-row">
        <div className="vc-form-group">
          <label htmlFor="vc-name">{isAr ? 'الاسم' : 'Full name'}</label>
          <input
            id="vc-name"
            type="text"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={isAr ? 'مثال: منى عبد الرحمن' : 'e.g. Mona Abdelrahman'}
            autoComplete="name"
          />
        </div>
        <div className="vc-form-group">
          <label htmlFor="vc-phone">{isAr ? 'الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
          <input
            id="vc-phone"
            type="tel"
            maxLength={20}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+2 01XXXXXXXXX"
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="vc-form-row">
        <div className="vc-form-group">
          <label htmlFor="vc-email">{isAr ? 'البريد الإلكتروني' : 'Email (optional)'}</label>
          <input
            id="vc-email"
            type="email"
            maxLength={254}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="vc-form-group">
          <label htmlFor="vc-intent">{isAr ? 'الغرض' : 'I want to'}</label>
          <select
            id="vc-intent"
            value={form.intent}
            onChange={(e) => set('intent', e.target.value)}
          >
            <option value="buy">{isAr ? 'شراء' : 'Buy'}</option>
            <option value="rent">{isAr ? 'إيجار' : 'Rent'}</option>
            <option value="sell">{isAr ? 'بيع' : 'Sell'}</option>
          </select>
        </div>
      </div>

      <div className="vc-form-row">
        <div className="vc-form-group">
          <label htmlFor="vc-budget">{isAr ? 'الميزانية' : 'Budget'}</label>
          <input
            id="vc-budget"
            type="text"
            maxLength={120}
            value={form.budget}
            onChange={(e) => set('budget', e.target.value)}
            placeholder={isAr ? 'مثال: ١٥ مليون جنيه' : 'e.g. EGP 15M'}
          />
        </div>
        <div className="vc-form-group">
          <label htmlFor="vc-zone">{isAr ? 'المنطقة / الكومباوند' : 'Area / compound'}</label>
          <input
            id="vc-zone"
            type="text"
            maxLength={120}
            value={form.zone}
            onChange={(e) => set('zone', e.target.value)}
            placeholder={isAr ? 'مثال: ميفيدا، القاهرة الجديدة' : 'e.g. Mivida, New Cairo'}
          />
        </div>
      </div>

      <div className="vc-form-group">
        <label htmlFor="vc-type">{isAr ? 'نوع العقار' : 'Property type'}</label>
        <select id="vc-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">{isAr ? 'أي نوع' : 'Any type'}</option>
          <option value="apartment">{isAr ? 'شقة' : 'Apartment'}</option>
          <option value="villa">{isAr ? 'فيلا' : 'Villa'}</option>
          <option value="townhouse">Townhouse</option>
          <option value="duplex">Duplex / Penthouse</option>
          <option value="office">{isAr ? 'إداري / تجاري' : 'Commercial / Office'}</option>
        </select>
      </div>

      <div className="vc-form-group">
        <label htmlFor="vc-message">{isAr ? 'تفاصيل إضافية' : 'Anything specific? (optional)'}</label>
        <textarea
          id="vc-message"
          rows={3}
          maxLength={2000}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          placeholder={
            isAr
              ? 'مثال: أحتاج تسليم فوري، حديقة، تشطيب كامل…'
              : 'e.g. ready delivery, garden, fully finished…'
          }
        />
      </div>

      <button type="submit" className="vc-form-submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="vc-btn-spinner" aria-hidden />
            {isAr ? 'جاري الإرسال...' : 'Sending…'}
          </>
        ) : (
          <>
            <Send aria-hidden style={{ width: 15, height: 15 }} />
            {isAr ? 'اطلب استشارة خاصة' : 'Request private advisory'}
          </>
        )}
      </button>

      <p className="vc-form-privacy">
        <ShieldCheck aria-hidden style={{ width: 13, height: 13, verticalAlign: '-2px' }} />{' '}
        {isAr
          ? 'بياناتك تُخزَّن في نظام CRM سييرا استيتس فقط ولن تُشارك.'
          : 'Your details live only in the Sierra Estates CRM and are never shared.'}
      </p>

      {submitError && (
        <div className="vc-form-error" role="alert">
          {submitError}
        </div>
      )}
    </form>
  );
}
