'use client';

import { useMemo, useState } from 'react';

type Props = { lang?: 'en' | 'ar' };

const money = (value: number, lang: 'en' | 'ar') => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value));

export default function CairoPlazaCalculator({ lang = 'en' }: Props) {
  const isAr = lang === 'ar';
  const [purchase, setPurchase] = useState(5000000);
  const [fitout, setFitout] = useState(250000);
  const [rent, setRent] = useState(85000);
  const [occupancy, setOccupancy] = useState(90);
  const [opex, setOpex] = useState(12);

  const result = useMemo(() => {
    const totalCost = purchase + fitout;
    const gross = rent * 12 * (occupancy / 100);
    const operatingCosts = gross * (opex / 100);
    const noi = gross - operatingCosts;
    return { totalCost, gross, operatingCosts, noi, yield: totalCost ? (noi / totalCost) * 100 : 0, payback: noi > 0 ? totalCost / noi : 0 };
  }, [purchase, fitout, rent, occupancy, opex]);

  const field = (label: string, value: number, setValue: (value: number) => void, suffix = '') => (
    <label className="cp-calc-field">
      <span>{label}</span>
      <div><input type="number" min="0" value={value} onChange={(event) => setValue(Number(event.target.value) || 0)} /><b>{suffix}</b></div>
    </label>
  );

  return (
    <section className="cp-calculator" dir={isAr ? 'rtl' : 'ltr'} aria-labelledby="cairo-plaza-calculator-title">
      <div className="cp-calc-head">
        <div>
          <p className="cp-eyebrow">{isAr ? 'حاسبة توضيحية' : 'ILLUSTRATIVE CALCULATOR'}</p>
          <h2 id="cairo-plaza-calculator-title">{isAr ? 'اختبر سيناريو العائد الاستثماري' : 'Test an investment-return scenario'}</h2>
          <p>{isAr ? 'عدّل الافتراضات لتقدير صافي الدخل والعائد السنوي وفترة الاسترداد.' : 'Adjust the assumptions to estimate net operating income, annual yield, and payback period.'}</p>
        </div>
        <div className="cp-calc-disclosure">{isAr ? 'سيناريو توضيحي — ليس ضمانًا استثماريًا' : 'Illustrative scenario — not an investment guarantee'}</div>
      </div>
      <div className="cp-calc-layout">
        <div className="cp-calc-inputs">
          {field(isAr ? 'سعر الشراء' : 'Purchase price', purchase, setPurchase, 'EGP')}
          {field(isAr ? 'تكلفة التجهيز' : 'Fit-out cost', fitout, setFitout, 'EGP')}
          {field(isAr ? 'الإيجار الشهري المتوقع' : 'Expected monthly rent', rent, setRent, 'EGP')}
          {field(isAr ? 'نسبة الإشغال' : 'Occupancy', occupancy, setOccupancy, '%')}
          {field(isAr ? 'المصروفات التشغيلية' : 'Operating expenses', opex, setOpex, '%')}
        </div>
        <div className="cp-calc-results" aria-live="polite">
          <div><span>{isAr ? 'إجمالي التكلفة' : 'Total cost'}</span><strong>{money(result.totalCost, lang)} EGP</strong></div>
          <div><span>{isAr ? 'صافي الدخل التشغيلي السنوي' : 'Annual NOI'}</span><strong>{money(result.noi, lang)} EGP</strong></div>
          <div><span>{isAr ? 'العائد السنوي التوضيحي' : 'Illustrative annual yield'}</span><strong>{result.yield.toFixed(2)}%</strong></div>
          <div><span>{isAr ? 'فترة الاسترداد التوضيحية' : 'Illustrative payback'}</span><strong>{result.payback ? `${result.payback.toFixed(1)} ${isAr ? 'سنوات' : 'years'}` : '—'}</strong></div>
        </div>
      </div>
      <p className="cp-calc-footnote">{isAr ? 'هذه أداة تعليمية مبنية على افتراضات قابلة للتعديل. لا تشمل الضرائب أو التمويل أو الشغور غير المخطط أو تغيرات السوق، ويجب تأكيد الأسعار والإيجارات والمصروفات والمخزون رسميًا قبل اتخاذ أي قرار.' : 'This educational tool uses editable assumptions. It excludes taxes, financing, unplanned vacancy, and market changes; prices, rents, expenses, and inventory must be officially verified before any decision.'}</p>
    </section>
  );
}
