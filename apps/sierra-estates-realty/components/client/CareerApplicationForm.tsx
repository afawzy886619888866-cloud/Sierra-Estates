'use client';

/**
 * SIERRA ESTATES — INTERACTIVE CAREER APPLICATION FORM (Module 3)
 *
 * Next.js Server Action form (`useActionState`, React 19) with Zod
 * server-side validation (lib/actions/career-application.ts):
 *   Full Name · Phone (+20, normalized server-side) · Email · Role Applied
 *   For · Work Mode (Online/In-Office) · Years of New Cairo Real Estate
 *   Experience · Previous Brokerage · Portfolio/CV URL or File Upload
 *   (Supabase Storage `career-applications` bucket) · Brief Pitch.
 *
 * Dual-writes to Supabase + Google Sheets `Careers_Applicants` and fires the
 * Telegram HR alert — all inside the action. Styled with the existing
 * `cr-form-*` classes from app/site-styles/career.css.
 */

import React, { useActionState, useState } from 'react';
import { CheckCircle2, Loader2, Send, UploadCloud, AlertCircle } from 'lucide-react';
import {
  submitCareerApplication,
  initialCareerFormState,
} from '@/lib/actions/career-application';

export default function CareerApplicationForm({
  isAr = false,
  defaultRole = '',
}: {
  isAr?: boolean;
  defaultRole?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitCareerApplication, initialCareerFormState);
  const [cvFileName, setCvFileName] = useState('');
  const [selectedRole, setSelectedRole] = useState(defaultRole);

  const roles = [
    'Online Real Estate Consultant',
    'In-Office Senior Property Advisor (Fifth Settlement)',
    'PropTech & Inventory Operations Specialist',
  ];
  const err = (field: string) => state.fieldErrors?.[field];

  if (state.status === 'success') {
    return (
      <div className="cr-form-card" style={{ textAlign: 'center' }}>
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
            margin: '0 auto 16px',
          }}
        >
          <CheckCircle2 style={{ width: 32, height: 32 }} />
        </div>
        <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>
          {isAr ? 'تم استلام طلب التقديم بنجاح!' : 'Application Received!'}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 520, margin: '0 auto 18px', lineHeight: 1.7 }}>
          {state.message}
        </p>
        <div
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid #c9a86a',
            fontFamily: 'monospace',
            fontWeight: 800,
            color: '#c9a86a',
            letterSpacing: '.04em',
          }}
        >
          {state.appId}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 16 }}>
          {isAr
            ? 'فريق الموارد البشرية يراجع كل الطلبات خلال 48 ساعة — تم إرسال تنبيه فوري لقسم التوظيف.'
            : 'Our HR team reviews every application within 48 hours — an instant alert has already reached the recruitment desk.'}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="cr-form-card" dir={isAr ? 'rtl' : 'ltr'}>
      {state.status === 'error' && !state.fieldErrors && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          <AlertCircle style={{ width: 16, height: 16, flex: 'none' }} />
          {state.message}
        </div>
      )}

      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="ca-fullName">{isAr ? 'الاسم بالكامل *' : 'Full Name *'}</label>
          <input
            id="ca-fullName"
            name="fullName"
            type="text"
            required
            maxLength={120}
            placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. Ahmed Mohamed'}
            aria-invalid={Boolean(err('fullName'))}
          />
          {err('fullName') && <FieldError>{err('fullName')}</FieldError>}
        </div>
        <div className="cr-form-group">
          <label htmlFor="ca-phone">{isAr ? 'الموبايل (+20) *' : 'Phone (+20) *'}</label>
          <input
            id="ca-phone"
            name="phone"
            type="tel"
            required
            inputMode="tel"
            maxLength={20}
            placeholder="01012345678"
            aria-invalid={Boolean(err('phone'))}
          />
          {err('phone') && <FieldError>{err('phone')}</FieldError>}
        </div>
      </div>

      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="ca-email">{isAr ? 'البريد الإلكتروني *' : 'Email *'}</label>
          <input
            id="ca-email"
            name="email"
            type="email"
            required
            maxLength={200}
            placeholder="you@example.com"
            aria-invalid={Boolean(err('email'))}
          />
          {err('email') && <FieldError>{err('email')}</FieldError>}
        </div>
        <div className="cr-form-group">
          <label htmlFor="ca-role">{isAr ? 'الوظيفة المتقدم لها *' : 'Role Applied For *'}</label>
          <select
            id="ca-role"
            name="role"
            required
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            aria-invalid={Boolean(err('role'))}
          >
            <option value="">{isAr ? '— اختر الوظيفة —' : '— Select a role —'}</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {err('role') && <FieldError>{err('role')}</FieldError>}
        </div>
      </div>

      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="ca-workMode">{isAr ? 'نمط العمل *' : 'Work Mode *'}</label>
          <select
            id="ca-workMode"
            name="workMode"
            required
            defaultValue={selectedRole.includes('Online') ? 'Online' : 'In-Office'}
            key={selectedRole}
            aria-invalid={Boolean(err('workMode'))}
          >
            <option value="Online">{isAr ? 'عن بُعد (Online)' : 'Online'}</option>
            <option value="In-Office">{isAr ? 'من المكتب (In-Office)' : 'In-Office'}</option>
          </select>
          {err('workMode') && <FieldError>{err('workMode')}</FieldError>}
        </div>
        <div className="cr-form-group">
          <label htmlFor="ca-experienceYears">
            {isAr ? 'سنوات خبرة العقارات (التجمع/القاهرة الجديدة) *' : 'Years of New Cairo Real Estate Experience *'}
          </label>
          <input
            id="ca-experienceYears"
            name="experienceYears"
            type="number"
            required
            min={0}
            max={50}
            step={0.5}
            placeholder="3"
            aria-invalid={Boolean(err('experienceYears'))}
          />
          {err('experienceYears') && <FieldError>{err('experienceYears')}</FieldError>}
        </div>
      </div>

      <div className="cr-form-group">
        <label htmlFor="ca-brokerage">{isAr ? 'شركة الوساطة السابقة' : 'Previous Brokerage'}</label>
        <input
          id="ca-brokerage"
          name="brokerage"
          type="text"
          maxLength={160}
          placeholder={isAr ? 'مثال: سوق مصر / بتروسبورت / مستقل' : 'e.g. Emaar Square brokerage / Independent'}
        />
      </div>

      <div className="cr-form-row">
        <div className="cr-form-group">
          <label htmlFor="ca-cvUrl">{isAr ? 'رابط السيرة الذاتية / البورتفوليو' : 'Portfolio / CV URL'}</label>
          <input
            id="ca-cvUrl"
            name="cvUrl"
            type="url"
            maxLength={500}
            placeholder="https://drive.google.com/…"
            aria-invalid={Boolean(err('cvUrl'))}
          />
          {err('cvUrl') && <FieldError>{err('cvUrl')}</FieldError>}
        </div>
        <div className="cr-form-group">
          <label htmlFor="ca-cvFile">{isAr ? 'أو ارفع ملف السيرة (PDF/Word ≤ 4MB)' : 'Or Upload CV File (PDF/Word ≤ 4MB)'}</label>
          <label
            htmlFor="ca-cvFile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              border: '1.5px dashed var(--line)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: 13,
              fontWeight: 500,
              textTransform: 'none',
              letterSpacing: 0,
              fontFamily: 'var(--font)',
            }}
          >
            <UploadCloud style={{ width: 18, height: 18, color: '#c9a86a', flex: 'none' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cvFileName || (isAr ? 'اضغط لاختيار ملف…' : 'Click to choose a file…')}
            </span>
          </label>
          <input
            id="ca-cvFile"
            name="cvFile"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => setCvFileName(e.target.files?.[0]?.name ?? '')}
          />
          {err('cvFile') && <FieldError>{err('cvFile')}</FieldError>}
        </div>
      </div>

      <div className="cr-form-group">
        <label htmlFor="ca-pitch">{isAr ? 'نبذة قصيرة: لماذا أنت الأنسب؟ *' : 'Brief Pitch — why you? *'}</label>
        <textarea
          id="ca-pitch"
          name="pitch"
          required
          rows={4}
          maxLength={2000}
          placeholder={
            isAr
              ? 'حدثنا عن أكبر صفقة أغلقتها، معرفتك بكمبوندات التجمع، ولماذا تريد الانضمام لسييرا استيتس…'
              : 'Tell us about your biggest closed deal, your compound knowledge (Hyde Park, iCity, Mivida…), and why Sierra Estates…'
          }
          aria-invalid={Boolean(err('pitch'))}
        />
        {err('pitch') && <FieldError>{err('pitch')}</FieldError>}
      </div>

      <button type="submit" className="cr-cta" disabled={isPending} style={{ width: '100%', justifyContent: 'center', border: 'none' }}>
        {isPending ? (
          <>
            <Loader2 style={{ width: 18, height: 18, animation: 'crSpin .8s linear infinite' }} />
            {isAr ? 'جارٍ إرسال الطلب…' : 'Submitting Application…'}
          </>
        ) : (
          <>
            <Send style={{ width: 16, height: 16 }} />
            {isAr ? 'إرسال طلب التقديم' : 'Submit Application'}
          </>
        )}
      </button>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11.5, margin: '14px 0 0' }}>
        {isAr
          ? 'يتم حفظ الطلب في قاعدة بيانات التوظيف + شيت الموارد البشرية الحي، وإرسال تنبيه فوري لفريق التوظيف.'
          : 'Your application is dual-written to our recruitment database + live HR sheet, with an instant Telegram alert to the hiring desk.'}
      </p>

      <style>{'@keyframes crSpin{to{transform:rotate(360deg)}}.cr-spin{animation:crSpin .8s linear infinite}'}</style>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'block', marginTop: 6, color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}
