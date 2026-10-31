'use client';

/**
 * SIERRA ESTATES — APPLICANT CAPTURE FORM (public careers intake)
 *
 * Direct-write component for the recruitment funnel: POSTs to
 * /api/careers/apply, which inserts into Supabase public.career_applications
 * (read back by /admin/applicants through the `applicants` view) with instant
 * user feedback — inline validation, submitting state, honest error banners
 * and a success confirmation.
 *
 * The CV field is a LINK (Drive/Dropbox), not a fake file picker: the file
 * input the old form shipped was never wired to storage, so it silently
 * dropped every "attached" CV. The link persists to career_applications.cv_url
 * (migration 037) and is inspected on the Recruitment console.
 *
 * Styling: the cr-* classes of the careers page (app/site-styles/career.css)
 * — the component is mounted inside the careers form card and inherits its
 * design system, light/dark included.
 */
import React, { useState } from 'react';
import { CheckCircle, Send } from 'lucide-react';

export interface ApplicantFormPosition {
  /** The value submitted as `position`. */
  value: string;
  /** The label rendered in the select. */
  label: string;
  /** Drives the API's required `role` discriminator ('sales' | 'admin'). */
  role: 'sales' | 'admin';
}

export default function ApplicantForm({
  positions,
  isAr = false,
  defaultPosition = '',
  whatsappApplyHref,
}: {
  positions: ApplicantFormPosition[];
  isAr?: boolean;
  defaultPosition?: string;
  whatsappApplyHref?: string;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    position: defaultPosition,
    experience: '2',
    hasVehicle: '',
    biggestAchievements: '',
    expectedSalary: '',
    message: '',
    cvUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const cvUrlTouchedButInvalid =
    form.cvUrl.trim() !== '' && !/^https?:\/\/\S+$/i.test(form.cvUrl.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cvUrlTouchedButInvalid) {
      setSubmitError(
        isAr
          ? 'رابط السيرة الذاتية يجب أن يبدأ بـ http:// أو https://'
          : 'The CV link must start with http:// or https://',
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const position = positions.find((p) => p.value === form.position);
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: position?.role ?? 'sales',
          fullName: form.name,
          phone: form.phone,
          email: form.email,
          position: form.position,
          experience: form.experience || '0',
          hasVehicle: form.hasVehicle === 'yes',
          biggestAchievements: form.biggestAchievements,
          expectedSalary: form.expectedSalary,
          realEstateKnowledge: '',
          availability: 'Immediately',
          notes: form.message || `Applied for: ${form.position}`,
          cvUrl: form.cvUrl.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({
        success: false,
        error: 'Unexpected server response.',
      }))) as { success?: boolean; error?: string };

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
      <div className="cr-success-msg">
        <CheckCircle style={{ width: 20, height: 20 }} />
        <span>
          {isAr
            ? 'تم استلام طلبك بنجاح! سيتواصل معك مسؤول التوظيف خلال 48 ساعة.'
            : 'Application submitted successfully! Our recruitment team will contact you within 48 hours.'}
          {whatsappApplyHref && (
            <>
              <br />
              <a
                href={whatsappApplyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="cr-success-link"
              >
                {isAr ? 'انضم إلى مجموعة واتساب للمتقدمين' : 'Join the applicants WhatsApp group'}
              </a>
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="f-name">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
          <input
            type="text"
            id="f-name"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder={isAr ? 'مثال: أحمد فوزي' : 'e.g. Ahmed Fawzy'}
          />
        </div>
        <div className="cr-form-group">
          <label htmlFor="f-phone">{isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}</label>
          <input
            type="tel"
            id="f-phone"
            required
            maxLength={40}
            value={form.phone}
            onChange={(e) => set('phone')(e.target.value)}
            placeholder="+2 01XXXXXXXXX"
          />
        </div>
      </div>

      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="f-email">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
          <input
            type="email"
            id="f-email"
            required
            maxLength={200}
            value={form.email}
            onChange={(e) => set('email')(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="cr-form-group">
          <label htmlFor="f-position">{isAr ? 'الوظيفة المتقدم لها' : 'Position'}</label>
          <select
            id="f-position"
            required
            value={form.position}
            onChange={(e) => set('position')(e.target.value)}
          >
            <option value="">{isAr ? 'اختر الوظيفة...' : 'Select a position...'}</option>
            {positions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="f-experience">
            {isAr ? 'سنوات الخبرة في العقارات أو المجال' : 'Years of Experience'}
          </label>
          <input
            type="number"
            id="f-experience"
            required
            min={0}
            max={35}
            value={form.experience}
            onChange={(e) => set('experience')(e.target.value)}
            placeholder="2"
          />
        </div>
        <div className="cr-form-group">
          <label htmlFor="f-vehicle">
            {isAr ? 'هل لديك سيارة؟' : 'Do you have a personal vehicle?'}
          </label>
          <select id="f-vehicle" required value={form.hasVehicle} onChange={(e) => set('hasVehicle')(e.target.value)}>
            <option value="">{isAr ? 'اختر إجابة...' : 'Select an answer...'}</option>
            <option value="yes">{isAr ? 'نعم' : 'Yes'}</option>
            <option value="no">{isAr ? 'لا' : 'No'}</option>
          </select>
        </div>
      </div>

      <div className="cr-form-group">
        <label htmlFor="f-salary">{isAr ? 'الراتب المتوقع' : 'Expected Salary'}</label>
        <input
          type="text"
          id="f-salary"
          required
          maxLength={80}
          value={form.expectedSalary}
          onChange={(e) => set('expectedSalary')(e.target.value)}
          placeholder={isAr ? 'مثال: ٢٠,٠٠٠ جنيه' : 'e.g. EGP 20,000'}
        />
      </div>

      <div className="cr-form-group">
        <label htmlFor="f-achievements">
          {isAr ? 'أكبر إنجازاتك المهنية' : 'Biggest Professional Achievements'}
        </label>
        <textarea
          id="f-achievements"
          rows={4}
          required
          maxLength={2000}
          value={form.biggestAchievements}
          onChange={(e) => set('biggestAchievements')(e.target.value)}
          placeholder={
            isAr
              ? 'اذكر إنجازاتك أو أهم الصفقات والنتائج التي حققتها...'
              : 'Share your strongest results, deals closed, or operational wins...'
          }
        />
      </div>

      <div className="cr-form-group">
        <label htmlFor="f-cv-url">
          {isAr ? 'رابط السيرة الذاتية (Google Drive / Dropbox)' : 'CV Link (Google Drive / Dropbox)'}
        </label>
        <input
          type="url"
          id="f-cv-url"
          maxLength={500}
          value={form.cvUrl}
          onChange={(e) => set('cvUrl')(e.target.value)}
          placeholder="https://drive.google.com/…"
          inputMode="url"
        />
        <small style={{ display: 'block', marginTop: 6, opacity: 0.65, fontSize: '0.75rem' }}>
          {isAr
            ? 'شاهد مسؤول التوظيف الرابط مباشرة في لوحة المتقدمين — تأكد من صلاحية الوصول للجميع.'
            : 'Our recruitment desk opens this link directly on the applicants console — make sure it is shared with “anyone with the link”.'}
        </small>
        {cvUrlTouchedButInvalid && (
          <small style={{ display: 'block', marginTop: 4, color: '#f87171', fontSize: '0.75rem' }}>
            {isAr ? 'أدخل رابطاً صالحاً يبدأ بـ https://' : 'Enter a valid link starting with https://'}
          </small>
        )}
      </div>

      <div className="cr-form-group">
        <label htmlFor="f-message">{isAr ? 'رسالة إضافية (اختياري)' : 'Additional message (optional)'}</label>
        <textarea
          id="f-message"
          rows={4}
          maxLength={4000}
          value={form.message}
          onChange={(e) => set('message')(e.target.value)}
          placeholder={
            isAr
              ? 'اذكر أهم الشركات التي عملت بها أو الصفقات التي قمت بإغلاقها...'
              : 'Mention past companies, key deals closed, or administrative achievements...'
          }
        />
      </div>

      <button type="submit" className="cr-submit-btn" disabled={isSubmitting}>
        {isSubmitting ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 16,
                height: 16,
                border: '2px solid #fff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            {isAr ? 'جاري الإرسال...' : 'Sending...'}
          </span>
        ) : (
          <>
            <Send style={{ width: 16, height: 16 }} />
            {isAr ? 'إرسال طلب التوظيف الآن' : 'Submit Application'}
          </>
        )}
      </button>

      {submitError && (
        <div
          className="cr-success-msg"
          style={{
            background: 'rgba(220, 38, 38, 0.12)',
            borderColor: 'rgba(220, 38, 38, 0.4)',
            color: '#f87171',
          }}
          role="alert"
        >
          ⚠️ {submitError}
        </div>
      )}
    </form>
  );
}
