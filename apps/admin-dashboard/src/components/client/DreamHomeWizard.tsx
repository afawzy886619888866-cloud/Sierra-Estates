import React, { useState } from 'react';

interface DreamHomeWizardProps {
  theme: string;
  isAr: boolean;
  /** Called with the recommended compound name when the user taps "View Units". */
  onViewUnits?: (compound: string) => void;
}

interface Opt { ic: string; t: string; d: string; }

const QUESTIONS_EN = ["What matters most?", "What's your budget?", "Lifestyle preference?", "How many rooms?"];
const QUESTIONS_AR = ['ما الأهم بالنسبة لك؟', 'ما هي ميزانيتك؟', 'نمط الحياة المفضل؟', 'كم عدد الغرف؟'];
const HINTS_EN = ['Your top priority shapes the match.', 'Set your comfortable range.', 'Where do you see yourself?', 'How many bedrooms?'];
const HINTS_AR = ['أولويتك الأولى تحدد المطابقة.', 'حدد نطاقك المريح.', 'أين ترى نفسك؟', 'كم عدد غرف النوم؟'];

const OPTS_EN: Opt[][] = [
  [{ ic: '📈', t: 'High ROI', d: 'Investment-first' }, { ic: '🏡', t: 'Family Life', d: 'Space & community' }, { ic: '🚗', t: 'Location', d: 'Commute & access' }, { ic: '🎨', t: 'Luxury Feel', d: 'Prestige & design' }],
  [{ ic: '💰', t: 'Under EGP 5M', d: 'Entry level' }, { ic: '🏠', t: 'EGP 5–15M', d: 'Mid range' }, { ic: '🌟', t: 'EGP 15–30M', d: 'Premium' }, { ic: '💎', t: 'EGP 30M+', d: 'Ultra luxury' }],
  [{ ic: '🏙️', t: 'Urban & Connected', d: 'Close to everything' }, { ic: '🌿', t: 'Green & Quiet', d: 'Nature & peace' }, { ic: '🏊', t: 'Resort Living', d: 'Amenities & clubs' }, { ic: '👨‍👩‍👧', t: 'Family Compound', d: 'Schools & safety' }],
  [{ ic: '1️⃣', t: 'Studio / 1 Bed', d: 'Solo or couple' }, { ic: '2️⃣', t: '2–3 Beds', d: 'Small family' }, { ic: '3️⃣', t: '4–5 Beds', d: 'Growing family' }, { ic: '🏰', t: '6+ Beds', d: 'Villa / mansion' }],
];

const OPTS_AR: Opt[][] = [
  [{ ic: '📈', t: 'عائد مرتفع', d: 'الاستثمار أولاً' }, { ic: '🏡', t: 'حياة عائلية', d: 'مساحة ومجتمع' }, { ic: '🚗', t: 'الموقع', d: 'سهولة الوصول' }, { ic: '🎨', t: 'إحساس الفخامة', d: 'رقي وتصميم' }],
  [{ ic: '💰', t: 'أقل من 5 مليون', d: 'مستوى مبتدئ' }, { ic: '🏠', t: '5–15 مليون', d: 'متوسط' }, { ic: '🌟', t: '15–30 مليون', d: 'مميز' }, { ic: '💎', t: '+30 مليون', d: 'فخامة قصوى' }],
  [{ ic: '🏙️', t: 'حضري ومتصل', d: 'قريب من كل شيء' }, { ic: '🌿', t: 'أخضر وهادئ', d: 'طبيعة وسكينة' }, { ic: '🏊', t: 'حياة المنتجعات', d: 'مرافق ونوادي' }, { ic: '👨‍👩‍👧', t: 'مجمع عائلي', d: 'مدارس وأمان' }],
  [{ ic: '1️⃣', t: 'ستوديو / غرفة', d: 'فرد أو زوجان' }, { ic: '2️⃣', t: '2–3 غرف', d: 'عائلة صغيرة' }, { ic: '3️⃣', t: '4–5 غرف', d: 'عائلة متنامية' }, { ic: '🏰', t: '+6 غرف', d: 'فيلا / قصر' }],
];

// Recommendation keyed on the first (priority) answer index.
const RESULTS: { compound: string; meta: string; metaAr: string; blurb: string; blurbAr: string }[] = [
  { compound: 'Mountain View iCity', meta: 'AI 9.6 · +24% growth', metaAr: 'ذكاء 9.6 · نمو +24٪', blurb: 'Best capital appreciation in New Cairo — investment-first pick.', blurbAr: 'أفضل ارتفاع رأسمالي في القاهرة الجديدة — الاختيار الاستثماري.' },
  { compound: 'Hyde Park New Cairo', meta: 'AI 9.8 · 5th Settlement', metaAr: 'ذكاء 9.8 · التجمع الخامس', blurb: 'Top schools, green spaces and a premium family community.', blurbAr: 'أفضل المدارس والمساحات الخضراء ومجتمع عائلي راقٍ.' },
  { compound: 'Mivida', meta: 'AI 9.1 · Emaar', metaAr: 'ذكاء 9.1 · إعمار', blurb: 'Central 5th Settlement with the best Ring Road access.', blurbAr: 'قلب التجمع الخامس مع أفضل وصول للطريق الدائري.' },
  { compound: 'Taj City', meta: 'AI 9.5 · New Cairo', metaAr: 'ذكاء 9.5 · القاهرة الجديدة', blurb: 'Ultra-luxury branded villas with resort-grade amenities.', blurbAr: 'فيلات فاخرة موقعة بمرافق على مستوى المنتجعات.' },
];

export default function DreamHomeWizard({ theme, isAr, onViewUnits }: DreamHomeWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const questions = isAr ? QUESTIONS_AR : QUESTIONS_EN;
  const hints = isAr ? HINTS_AR : HINTS_EN;
  const opts = isAr ? OPTS_AR : OPTS_EN;

  const pick = (idx: number) => {
    const next = [...answers, idx];
    setAnswers(next);
    if (step < 3) setStep((s) => s + 1);
    else setDone(true);
  };

  const reset = () => { setStep(0); setAnswers([]); setDone(false); };

  const res = RESULTS[answers[0] ?? 0] || RESULTS[0];

  return (
    <div className="text-left">
      <p className="text-[11px] text-slate-400 mb-3">
        {isAr ? '4 أسئلة ← الذكاء الاصطناعي يوصي بمجمعك' : '4 questions → AI recommends your compound'}
      </p>

      {/* Progress */}
      <div className="flex gap-1.5 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
              i < (done ? 4 : step) ? 'bg-gradient-to-r from-[#E9C176] to-[#C8961A]' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {done ? (
        <div className="text-center animate-fade-in-up">
          <div className="text-4xl mb-2">🏆</div>
          <div className="font-mono text-[8px] tracking-[0.2em] uppercase text-[#C8961A] mb-1.5">
            {isAr ? 'مطابقتك المثالية' : 'Your perfect match'}
          </div>
          <div className="font-serif text-3xl font-semibold text-white mb-1 leading-tight">{res.compound}</div>
          <div className="font-mono text-[10px] text-[#C8961A] mb-4">{isAr ? res.metaAr : res.meta}</div>
          <div className="text-xs text-slate-300 leading-relaxed rounded-xl bg-[#C8961A]/5 border border-[#C8961A]/15 px-4 py-3 mb-5 text-left">
            {isAr ? res.blurbAr : res.blurb}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-[11px] hover:text-white transition"
            >
              {isAr ? 'ابدأ من جديد' : 'Start Over'}
            </button>
            <button
              onClick={() => onViewUnits?.(res.compound)}
              className="flex-1 py-2.5 rounded-lg bg-[#C8961A] hover:bg-[#E9C176] text-[#0D2035] text-[11px] font-extrabold uppercase transition"
            >
              {isAr ? 'عرض الوحدات →' : 'View Units →'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="font-serif text-2xl font-medium text-white mb-1 leading-snug">{questions[step]}</div>
          <p className="text-xs text-slate-400 mb-5">{hints[step]}</p>
          <div className="flex flex-col gap-2.5">
            {opts[step].map((o, i) => (
              <button
                key={i}
                onClick={() => pick(i)}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-slate-800 hover:border-[#C8961A]/40 hover:bg-[#C8961A]/5 transition text-left"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/60 text-xl shrink-0">{o.ic}</div>
                <div>
                  <div className="text-sm font-semibold text-white">{o.t}</div>
                  <div className="text-[11px] text-slate-400">{o.d}</div>
                </div>
              </button>
            ))}
          </div>
          {step > 0 && (
            <button
              onClick={() => { setStep((s) => s - 1); setAnswers((a) => a.slice(0, -1)); }}
              className="mt-4 text-[11px] font-semibold text-slate-400 hover:text-white transition"
            >
              {isAr ? '← رجوع' : '← Back'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
