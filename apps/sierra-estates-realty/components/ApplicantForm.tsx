'use client';

/**
 * SIERRA ESTATES — APPLICANT CAPTURE FORM (public careers intake)
 *
 * Direct-write component for the recruitment funnel: POSTs to
 * /api/careers/apply, which inserts into Supabase public.career_applications
 * and syncs to Google Sheets (Tab: Career_Applications) + local JSON mirror,
 * with an instant VIP response page gathering candidate information.
 */
import React, { useState } from 'react';
import {
  CheckCircle,
  Send,
  Copy,
  Check,
  Briefcase,
  Phone,
  Mail,
  User,
  Car,
  FileText,
  Clock,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';

export interface ApplicantFormPosition {
  /** The value submitted as `position`. */
  value: string;
  /** The label rendered in the select. */
  label: string;
  /** Drives the API's required `role` discriminator ('sales' | 'admin'). */
  role: 'sales' | 'admin';
}

interface SubmittedCandidate {
  applicationId: string;
  timestamp: string;
  role: string;
  position: string;
  fullName: string;
  phone: string;
  email: string;
  experience: string;
  hasVehicle: boolean;
  expectedSalary: string;
  biggestAchievements: string;
  cvUrl: string;
  message: string;
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
  const [submittedCandidate, setSubmittedCandidate] = useState<SubmittedCandidate | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const cvUrlTouchedButInvalid =
    form.cvUrl.trim() !== '' && !/^https?:\/\/\S+$/i.test(form.cvUrl.trim());

  const handleCopyId = () => {
    if (!submittedCandidate) return;
    navigator.clipboard.writeText(submittedCandidate.applicationId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

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

    const position = positions.find((p) => p.value === form.position);
    const role = position?.role ?? 'sales';

    try {
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          fullName: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          position: form.position,
          experience: form.experience || '0',
          hasVehicle: form.hasVehicle === 'yes',
          biggestAchievements: form.biggestAchievements.trim(),
          expectedSalary: form.expectedSalary.trim(),
          realEstateKnowledge: '',
          availability: 'Immediately',
          notes: form.message.trim() || `Applied for: ${form.position}`,
          cvUrl: form.cvUrl.trim() || undefined,
        }),
      });

      const json = (await res.json().catch(() => ({
        success: false,
        error: 'Unexpected server response.',
      }))) as { success?: boolean; applicationId?: string; error?: string };

      if (!res.ok || !json.success) {
        setSubmitError(
          json.error ||
            (isAr ? 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً.' : 'Submission failed. Please try again.'),
        );
        return;
      }

      setSubmittedCandidate({
        applicationId: json.applicationId || `CAR-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        role,
        position: form.position,
        fullName: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        experience: form.experience || '0',
        hasVehicle: form.hasVehicle === 'yes',
        expectedSalary: form.expectedSalary.trim(),
        biggestAchievements: form.biggestAchievements.trim(),
        cvUrl: form.cvUrl.trim(),
        message: form.message.trim(),
      });
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

  // ── Success Response Screen Gathering Information ──
  if (submittedCandidate) {
    const waText = isAr
      ? `مرحباً سييرا إيستيتس، قمت بتقديم طلب توظيف لوظيفة (${submittedCandidate.position}) بكود رقم (${submittedCandidate.applicationId}). الاسم: ${submittedCandidate.fullName}. أرجو المتابعة.`
      : `Hello Sierra Estates, I submitted an application for (${submittedCandidate.position}) with reference (${submittedCandidate.applicationId}). Name: ${submittedCandidate.fullName}. Please confirm receipt.`;
    const waUrl = `https://wa.me/201092048333?text=${encodeURIComponent(waText)}`;

    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(6, 17, 34, 0.95) 0%, rgba(13, 33, 54, 0.95) 100%)',
          border: '1.5px solid rgba(201, 168, 76, 0.75)',
          borderRadius: 20,
          padding: '32px 28px',
          textAlign: isAr ? 'right' : 'left',
          color: '#ffffff',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              color: '#10b981',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
            }}
          >
            <CheckCircle style={{ width: 34, height: 34 }} />
          </div>

          <h3 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px' }}>
            {isAr ? 'تم استلام وتوثيق طلب انضمامك بنجاح!' : 'Application Verified & Submitted!'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 13.5, margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            {isAr
              ? 'تم حفظ كافة بياناتك في قاعدة بيانات التوظيف والشيت الحي للموارد البشرية، وتم إنشاء رقم متابعة رسمي لطلبك.'
              : 'Your complete profile has been logged into our talent database & live recruitment sheet with a unique tracking reference.'}
          </p>
        </div>

        {/* Tracking Code Container */}
        <div
          style={{
            maxWidth: 420,
            margin: '0 auto 24px',
            padding: '14px 20px',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(201, 168, 76, 0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#C9A84C', letterSpacing: '0.08em', display: 'block' }}>
              APPLICATION TRACKING ID
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#FDE047' }}>
              {submittedCandidate.applicationId}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              background: copiedId ? '#10b981' : 'rgba(201, 168, 76, 0.2)',
              color: copiedId ? '#ffffff' : '#fde047',
              border: copiedId ? '1px solid #10b981' : '1px solid rgba(201, 168, 76, 0.5)',
            }}
          >
            {copiedId ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
            <span>{copiedId ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy ID')}</span>
          </button>
        </div>

        {/* Gathered Candidate Information Breakdown */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '20px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ShieldCheck style={{ width: 16, height: 16, color: '#10b981' }} />
            <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#f8fafc' }}>
              {isAr ? 'ملخص بيانات المرشح المسجلة:' : 'Candidate Profile Summary:'}
            </h4>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              fontSize: 12.5,
            }}
          >
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'الاسم' : 'Full Name'}</span>
              <strong style={{ color: '#ffffff' }}>{submittedCandidate.fullName}</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'الموبايل' : 'Phone'}</span>
              <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{submittedCandidate.phone}</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'الوظيفة المتقدم لها' : 'Position'}</span>
              <strong style={{ color: '#fde047' }}>{submittedCandidate.position}</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'سنوات الخبرة' : 'Experience'}</span>
              <strong style={{ color: '#ffffff' }}>{submittedCandidate.experience} {isAr ? 'سنوات' : 'years'}</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'سيارة خاصة' : 'Personal Vehicle'}</span>
              <strong style={{ color: submittedCandidate.hasVehicle ? '#10b981' : '#94a3b8' }}>
                {submittedCandidate.hasVehicle ? (isAr ? 'نعم متوفرة ✓' : 'Yes Available ✓') : isAr ? 'لا يوجد' : 'No'}
              </strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'الراتب المتوقع' : 'Expected Salary'}</span>
              <strong style={{ color: '#38bdf8' }}>{submittedCandidate.expectedSalary || 'Negotiable'}</strong>
            </div>
            {submittedCandidate.cvUrl && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8, gridColumn: '1 / -1' }}>
                <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'رابط السيرة الذاتية' : 'CV Link'}</span>
                <a
                  href={submittedCandidate.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#38bdf8', wordBreak: 'break-all', fontSize: 12 }}
                >
                  {submittedCandidate.cvUrl}
                </a>
              </div>
            )}
            {submittedCandidate.biggestAchievements && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8, gridColumn: '1 / -1' }}>
                <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{isAr ? 'أبرز الإنجازات' : 'Key Achievements'}</span>
                <p style={{ margin: '4px 0 0', color: '#e2e8f0', fontSize: 12 }}>{submittedCandidate.biggestAchievements}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Hiring Roadmap Timeline ── */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h5 style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            {isAr ? 'مراحل التقييم والتوظيف' : 'Hiring Process & Next Steps'}
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, padding: '12px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', marginBottom: 4 }}>
                1. {isAr ? 'مراجعة الملف' : 'Profile Review'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {isAr ? 'فحص السيرة الذاتية ومطابقة الخبرات (خلال 24 ساعة)' : 'HR & AI screening against role criteria'}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#fde047', marginBottom: 4 }}>
                2. {isAr ? 'المقابلة الهاتفية' : 'Phone Screening'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {isAr ? 'مكالمة استكشافية ومناقشة تفاصيل التارجت والراتب' : 'Introductory call regarding background & goals'}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>
                3. {isAr ? 'المقابلة بمقر الشركة' : 'Final Interview'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {isAr ? 'المقابلة النهائية بمقر التجمع الخامس وتوقيع العقد' : 'In-person meeting at New Cairo Flagship Hub'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 800,
              background: '#10b981',
              color: '#ffffff',
              textDecoration: 'none',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
            }}
          >
            <MessageCircle style={{ width: 16, height: 16 }} />
            <span>{isAr ? 'تواصل مع مسؤول التوظيف عبر واتساب' : 'WhatsApp Talent Desk (+20 109 204 8333)'}</span>
          </a>

          {whatsappApplyHref && (
            <a
              href={whatsappApplyHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                background: 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.2)',
                textDecoration: 'none',
              }}
            >
              <span>{isAr ? 'جروب المتقدمين لوظائف سييرا' : 'Applicants WhatsApp Channel'}</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              setSubmittedCandidate(null);
              setForm({
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
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 18px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw style={{ width: 14, height: 14 }} />
            <span>{isAr ? 'تقديم طلب لوظيفة أخرى' : 'Apply for Another Role'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Standard Interactive Application Form ──
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
          <label htmlFor="f-phone">{isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
          <input
            type="tel"
            id="f-phone"
            required
            maxLength={40}
            value={form.phone}
            onChange={(e) => set('phone')(e.target.value)}
            placeholder="010XXXXXXXX"
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
            placeholder="name@example.com"
          />
        </div>
        <div className="cr-form-group">
          <label htmlFor="f-position">{isAr ? 'الوظيفة المتقدم لها' : 'Target Position'}</label>
          <select
            id="f-position"
            required
            value={form.position}
            onChange={(e) => set('position')(e.target.value)}
          >
            <option value="" disabled>
              {isAr ? 'اختر الوظيفة…' : 'Select a position…'}
            </option>
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
          <label htmlFor="f-exp">{isAr ? 'سنوات الخبرة في العقارات' : 'Real Estate Experience'}</label>
          <select
            id="f-exp"
            value={form.experience}
            onChange={(e) => set('experience')(e.target.value)}
          >
            <option value="0">{isAr ? 'حديث التخرج / بدون خبرة سابقة' : 'Fresh Graduate / Entry Level'}</option>
            <option value="1">{isAr ? 'سنة واحدة' : '1 Year'}</option>
            <option value="2">{isAr ? 'سنتان' : '2 Years'}</option>
            <option value="3-5">{isAr ? '3 - 5 سنوات' : '3 - 5 Years'}</option>
            <option value="5+">{isAr ? 'أكثر من 5 سنوات' : '5+ Years'}</option>
          </select>
        </div>
        <div className="cr-form-group">
          <label htmlFor="f-vehicle">{isAr ? 'هل تمتلك سيارة خاصة؟' : 'Do you own a car?'}</label>
          <select
            id="f-vehicle"
            required
            value={form.hasVehicle}
            onChange={(e) => set('hasVehicle')(e.target.value)}
          >
            <option value="" disabled>
              {isAr ? 'اختر…' : 'Select…'}
            </option>
            <option value="yes">{isAr ? 'نعم، أمتلك سيارة خاصة' : 'Yes, I have a car'}</option>
            <option value="no">{isAr ? 'لا، لا أمتلك سيارة' : 'No, I do not'}</option>
          </select>
        </div>
      </div>

      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="f-salary">{isAr ? 'الراتب والعمولات المتوقعة' : 'Expected Package'}</label>
          <input
            type="text"
            id="f-salary"
            required
            maxLength={80}
            value={form.expectedSalary}
            onChange={(e) => set('expectedSalary')(e.target.value)}
            placeholder={isAr ? 'مثال: 12,000 ج أساسي + عمولة' : 'e.g. 12k base + commission'}
          />
        </div>
        <div className="cr-form-group">
          <label htmlFor="f-cv">
            {isAr ? 'رابط السيرة الذاتية (Google Drive / LinkedIn)' : 'CV Link (Drive, Dropbox, LinkedIn)'}
          </label>
          <input
            type="url"
            id="f-cv"
            value={form.cvUrl}
            onChange={(e) => set('cvUrl')(e.target.value)}
            placeholder="https://drive.google.com/..."
          />
        </div>
      </div>

      <div className="cr-form-group">
        <label htmlFor="f-achieve">
          {isAr
            ? 'أبرز الإنجازات والصفقات المغلقة في مسيرتك المهنية'
            : 'Key Career Achievements & Deals Closed'}
        </label>
        <textarea
          id="f-achieve"
          required
          rows={3}
          maxLength={2000}
          value={form.biggestAchievements}
          onChange={(e) => set('biggestAchievements')(e.target.value)}
          placeholder={
            isAr
              ? 'اذكر باختصار المطورين الذين عملت معهم أو قيمة المبيعات التي حققتها…'
              : 'Briefly mention developers you have worked with, sales targets met, etc.'
          }
        />
      </div>

      <div className="cr-form-group">
        <label htmlFor="f-notes">
          {isAr ? 'ملاحظات إضافية أو رسالة إلى الإدارة' : 'Additional Message (Optional)'}
        </label>
        <textarea
          id="f-notes"
          rows={2}
          maxLength={4000}
          value={form.message}
          onChange={(e) => set('message')(e.target.value)}
          placeholder={isAr ? 'أي معلومات أخرى تود مشاركتها…' : 'Any additional details you want to share…'}
        />
      </div>

      {submitError && <div className="cr-error-msg">{submitError}</div>}

      <button type="submit" className="cr-submit-btn" disabled={isSubmitting}>
        {isSubmitting ? (
          <span>{isAr ? 'جاري إرسال الطلب والمزامنة…' : 'Submitting Application…'}</span>
        ) : (
          <>
            <Send style={{ width: 16, height: 16 }} />
            <span>{isAr ? 'إرسال طلب التوظيف الآن' : 'Submit Application Now'}</span>
          </>
        )}
      </button>
    </form>
  );
}
