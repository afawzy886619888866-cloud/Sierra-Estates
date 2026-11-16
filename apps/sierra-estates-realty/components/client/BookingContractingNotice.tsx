import React from 'react';

/**
 * BookingContractingNotice — MANDATORY on every Cairo Plaza content surface.
 *
 * Carries the official Booking & Contracting disclaimer verbatim from
 * `announcement/DISCLAIMER.txt` (single source of truth). Do not edit,
 * translate, shorten or paraphrase the Arabic text below — it must stay
 * an exact, character-for-character match.
 *
 * Rendered automatically at the bottom of every /cairo-plaza and
 * /ar/cairo-plaza page via the route layouts.
 */

export const BOOKING_CONTRACTING_DISCLAIMER_AR =
  'يتم توقيع العقد وإستلام أصل إستمارة الحجز مختومة بخاتم الشركة وتسليم دفعة التعاقد وإستلام إيصالات السداد من الإدارة المالية الموجودة بالعمارة رقم (1) بالدور الثاني بمشروع كايرو بلازا المطرية. يتم إستلام أصل العقد الموقع من الشركة بحد أقصى (7) أيام عمل من تاريخ توقيع العميل على العقد.';

const DISCLAIMER_EN =
  'The contract is signed, the original booking form stamped with the company seal is received, the contracting deposit is paid, and the payment receipts are received from the Financial Administration located in Building No. (1), second floor, Cairo Plaza El-Mataria project. The original contract signed by the company is received within a maximum of (7) business days from the date the client signs the contract.';

export default function BookingContractingNotice({ lang = 'ar' }: { lang?: 'ar' | 'en' }) {
  const arFirst = lang === 'ar';
  const title = arFirst
    ? { badge: 'الإجراء الرسمي الملزم للتعاقد', heading: 'خطوات الحجز والتعاقد', sub: 'Booking & Contracting Steps — Cairo Plaza El-Mataria' }
    : { badge: 'Mandatory Official Contracting Procedure', heading: 'Booking & Contracting Steps', sub: 'خطوات الحجز والتعاقد — كايرو بلازا المطرية' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;900&display=swap');
        .bcn-root{position:relative;z-index:1;margin:56px auto 24px;max-width:1080px;width:calc(100% - 40px);
          background:linear-gradient(180deg,#faf6ec 0%,#f6f0e2 100%);border:2px solid #c9a227;border-radius:18px;
          padding:34px 34px 26px;box-shadow:0 18px 50px rgba(0,0,0,.45),inset 0 0 0 1px rgba(201,162,39,.25);
          color:#3b2f22;font-family:'Cairo','Tajawal','Segoe UI',Tahoma,sans-serif;}
        .bcn-badge{display:inline-block;background:#8f1f2c;color:#faf6ec;font-weight:700;font-size:13px;
          letter-spacing:.02em;padding:6px 16px;border-radius:999px;margin-bottom:14px;}
        .bcn-title{margin:0 0 4px;color:#8f1f2c;font-weight:900;font-size:clamp(22px,3vw,30px);line-height:1.25;}
        .bcn-sub{margin:0 0 18px;color:#7a6a52;font-weight:600;font-size:14px;}
        .bcn-divider{display:flex;align-items:center;gap:10px;margin:0 0 18px;color:#a4906e;}
        .bcn-divider::before,.bcn-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,#a4906e,transparent);}
        .bcn-divider span{font-size:15px;}
        .bcn-highlight{direction:rtl;text-align:right;background:#fff8e6;border:1.5px solid #c9a227;
          border-right:6px solid #8f1f2c;border-radius:12px;padding:20px 22px;}
        .bcn-ar{margin:0;color:#5a1420;font-weight:700;font-size:clamp(15px,2vw,18.5px);line-height:2.05;}
        .bcn-en{margin:14px 0 0;color:#6d5c44;font-size:13.5px;line-height:1.75;font-weight:500;}
        .bcn-foot{margin:18px 0 0;text-align:center;color:#8f1f2c;font-weight:700;font-size:14px;}
        .bcn-foot small{display:block;color:#7a6a52;font-weight:600;font-size:11.5px;margin-top:2px;}
        @media (max-width:640px){.bcn-root{padding:24px 18px 18px;margin:36px auto 16px;}.bcn-highlight{padding:16px 14px;}}
      `}</style>
      <section className="bcn-root" id="booking-contracting-notice" aria-label="Booking and Contracting Notice">
        <span className="bcn-badge">★ {title.badge}</span>
        <h2 className="bcn-title">{title.heading}</h2>
        <p className="bcn-sub">{title.sub}</p>
        <div className="bcn-divider" aria-hidden="true"><span>◆</span></div>
        <div className="bcn-highlight">
          <p className="bcn-ar">{BOOKING_CONTRACTING_DISCLAIMER_AR}</p>
          <p className="bcn-en"><strong>EN reference translation:</strong> {DISCLAIMER_EN}</p>
        </div>
        <p className="bcn-foot">
          مع تحيات إدارة مشروع كايرو بلازا المطرية
          <small>With compliments — Cairo Plaza El-Mataria Project Management</small>
        </p>
      </section>
    </>
  );
}
