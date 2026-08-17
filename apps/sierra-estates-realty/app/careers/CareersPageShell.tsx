'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CareersPageShell() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [selectedRole, setSelectedRole] = useState<'sales' | 'admin' | null>(null);
  const [answers, setAnswers] = useState({
    fullName: '',
    phone: '',
    email: '',
    experience: '3-5 years',
    realEstateKnowledge: 'expert',
    availability: 'immediate',
    expectedSalary: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold tracking-wider text-amber-400">
              SIERRA ESTATES
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-sm font-medium text-slate-300">
              {lang === 'ar' ? 'الوظائف والفرص المهنية' : 'Careers & Opportunities'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 text-xs rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
            >
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
            >
              {lang === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4 inline-block">
            {lang === 'ar' ? 'انضم إلى فريق النخبة العقارية' : 'Join our Elite Real Estate Team'}
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            {lang === 'ar' ? 'ابنِ مستقبلك المهني معنا في Sierra Estates' : 'Build Your Professional Career With Us'}
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            {lang === 'ar'
              ? 'نحن نؤمن بأن الكوادر الاستثنائية هي أساس نجاح المشاريع الفاخرة مثل كايرو بلازا وتوسعات القاهرة الجديدة. نوفر بيئة عمل تنافسية، عمولات مجزية، ومساراً مهنياً واضحاً.'
              : 'We believe exceptional talent is the foundation of flagship projects like Cairo Plaza and New Cairo expansions. We offer competitive compensation, lucrative commissions, and clear career pathways.'}
          </p>
        </div>
      </section>

      {/* Job Descriptions & Landing Questions */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Sales Role Card */}
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-semibold">
                  {lang === 'ar' ? 'دوام كامل — قسم المبيعات' : 'Full Time — Sales Division'}
                </span>
                <span className="text-xs text-slate-400">New Cairo, Egypt</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {lang === 'ar' ? 'مستشار عقاري أول — مبيعات فاخرة' : 'Senior Real Estate Consultant — Luxury Sales'}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {lang === 'ar'
                  ? 'قيادة علاقات المستثمرين وكبار العملاء في المشروعات التجارية والإدارية والسكنية الكبرى (مثل كايرو بلازا والتجمع الخامس). تتضمن المسؤوليات إجراء جولات المعاينة الميدانية، تقديم تحليلات العائد الاستثماري (ROI)، وإغلاق الصفقات.'
                  : 'Lead VIP client advisory in premier commercial and residential developments (such as Cairo Plaza and New Cairo). Responsibilities include site tours, ROI analysis, and deal closing.'}
              </p>
              <div className="space-y-3 mb-8 text-sm text-slate-300 border-t border-b border-slate-800 py-4">
                <div className="font-semibold text-amber-400 mb-1">{lang === 'ar' ? 'المتطلبات الأساسية:' : 'Key Requirements:'}</div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">✓</span> <span>{lang === 'ar' ? 'خبرة لا تقل عن 3 سنوات في المبيعات العقارية الفاخرة بالقاهرة الجديدة.' : 'Min 3 years luxury real estate sales experience in Cairo.'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">✓</span> <span>{lang === 'ar' ? 'مهارات تفاوض وإقناع عالية مع المستثمرين.' : 'Exceptional negotiation & investor management skills.'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">✓</span> <span>{lang === 'ar' ? 'إجادة تامة للغة الإنجليزية والتعامل مع برامج إدارة علاقات العملاء CRM.' : 'Fluent English & CRM proficiency.'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedRole('sales')}
              className={`w-full py-3.5 rounded font-bold text-xs transition ${
                selectedRole === 'sales'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {lang === 'ar' ? 'التقدم لوظيفة مستشار مبيعات' : 'Apply for Sales Consultant'}
            </button>
          </div>

          {/* Admin Role Card */}
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold">
                  {lang === 'ar' ? 'دوام كامل — قسم الإدارة' : 'Full Time — Administration Division'}
                </span>
                <span className="text-xs text-slate-400">New Cairo, Egypt</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {lang === 'ar' ? 'مسؤول العمليات والإدارة التنفيذية' : 'Executive Operations & Admin Officer'}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {lang === 'ar'
                  ? 'إدارة وتنظيم العمليات الداخلية، تحديث جداول المخزون الحي في نظام Airtable و Firebase، متابعة العقود والعلاقات مع الوسطاء والشركاء، وتنظيم الاجتماعات التنفيذية وتقارير الأداء.'
                  : 'Manage internal operations, maintain live inventory records in Airtable and Firebase, coordinate contracts and broker relations, and produce executive performance reports.'}
              </p>
              <div className="space-y-3 mb-8 text-sm text-slate-300 border-t border-b border-slate-800 py-4">
                <div className="font-semibold text-blue-400 mb-1">{lang === 'ar' ? 'المتطلبات الأساسية:' : 'Key Requirements:'}</div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">✓</span> <span>{lang === 'ar' ? 'خبرة سنتين على الأقل في الإدارة التنفيذية أو العمليات العقارية.' : 'Min 2 years experience in executive admin or real estate ops.'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">✓</span> <span>{lang === 'ar' ? 'إتقان تام لجداول البيانات المتقدمة (Excel) وأنظمة قواعد البيانات.' : 'Advanced Excel & database system proficiency.'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">✓</span> <span>{lang === 'ar' ? 'دقة عالية، تنظيم ممتاز، وقدرة على إدارة المهام المتعددة تحت الضغط.' : 'Meticulous attention to detail and multitasking under pressure.'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedRole('admin')}
              className={`w-full py-3.5 rounded font-bold text-xs transition ${
                selectedRole === 'admin'
                  ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {lang === 'ar' ? 'التقدم للوظيفة الإدارية' : 'Apply for Admin Role'}
            </button>
          </div>
        </div>

        {/* Candidate Application Questionnaire */}
        {selectedRole && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white">
                {lang === 'ar'
                  ? `استمارة الترشح لفرصة: ${selectedRole === 'sales' ? 'مستشار مبيعات أول' : 'مسؤول العمليات الإدارية'}`
                  : `Application Form: ${selectedRole === 'sales' ? 'Senior Sales Consultant' : 'Operations Admin Officer'}`}
              </h3>
              <button
                onClick={() => setSelectedRole(null)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800"
              >
                {lang === 'ar' ? 'إغلاق ✕' : 'Close ✕'}
              </button>
            </div>

            {submitted ? (
              <div className="p-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <div className="text-emerald-400 text-3xl font-bold">✓</div>
                <h4 className="text-xl font-bold text-emerald-400">
                  {lang === 'ar' ? 'تم استلام طلب ترشحك بنجاح!' : 'Application Submitted Successfully!'}
                </h4>
                <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
                  {lang === 'ar'
                    ? 'نشكر لك اهتمامك بالانضمام إلى فريق Sierra Estates. سيقوم فريق الموارد البشرية بمراجعة ملفك وإجاباتك والتواصل معك عبر الهاتف والبريد الإلكتروني خلال 48 ساعة.'
                    : 'Thank you for your interest in joining Sierra Estates. Our HR team will review your application and contact you within 48 hours.'}
                </p>
                <button
                  onClick={() => { setSubmitted(false); setSelectedRole(null); }}
                  className="mt-4 px-6 py-2 bg-slate-800 text-slate-200 rounded text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {lang === 'ar' ? 'العودة للوظائف' : 'Back to Careers'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      placeholder={lang === 'ar' ? 'محمد أحمد محمود' : 'John Doe'}
                      value={answers.fullName}
                      onChange={(e) => setAnswers({ ...answers, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {lang === 'ar' ? 'رقم الهاتف / واتساب *' : 'Phone / WhatsApp *'}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      placeholder="+20 100 000 0000"
                      value={answers.phone}
                      onChange={(e) => setAnswers({ ...answers, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      placeholder="name@example.com"
                      value={answers.email}
                      onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {lang === 'ar' ? 'سنوات الخبرة في المجال' : 'Years of Experience'}
                    </label>
                    <select
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      value={answers.experience}
                      onChange={(e) => setAnswers({ ...answers, experience: e.target.value })}
                    >
                      <option value="1-2">1 - 2 {lang === 'ar' ? 'سنوات' : 'years'}</option>
                      <option value="3-5">3 - 5 {lang === 'ar' ? 'سنوات' : 'years'}</option>
                      <option value="5+">5+ {lang === 'ar' ? 'سنوات فأكثر' : 'years or more'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {lang === 'ar' ? 'مدى الإلمام بالسوق العقاري وأنظمة CRM' : 'Market & CRM Knowledge'}
                    </label>
                    <select
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      value={answers.realEstateKnowledge}
                      onChange={(e) => setAnswers({ ...answers, realEstateKnowledge: e.target.value })}
                    >
                      <option value="expert">{lang === 'ar' ? 'خبير (القاهرة الجديدة والعاصمة الإدارية)' : 'Expert (New Cairo & New Capital)'}</option>
                      <option value="good">{lang === 'ar' ? 'متوسط (معرفة جيدة بالمجال)' : 'Moderate (Good understanding)'}</option>
                      <option value="beginner">{lang === 'ar' ? 'مبتدئ / استعداد كامل للتعلم السريع' : 'Junior / Eager to learn quickly'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {lang === 'ar' ? 'القدرة على بدء العمل' : 'Availability to Start'}
                    </label>
                    <select
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      value={answers.availability}
                      onChange={(e) => setAnswers({ ...answers, availability: e.target.value })}
                    >
                      <option value="immediate">{lang === 'ar' ? 'فورا (بدون فترة إخطار)' : 'Immediate'}</option>
                      <option value="two-weeks">{lang === 'ar' ? 'خلال أسبوعين' : 'Within 2 weeks'}</option>
                      <option value="one-month">{lang === 'ar' ? 'خلال شهر' : 'Within a month'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {lang === 'ar' ? 'لماذا ترغب في الانضمام إلى Sierra Estates؟ وما هي أبرز إنجازاتك؟ *' : 'Why do you want to join Sierra Estates? *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    placeholder={lang === 'ar' ? 'اكتب نبذة موجزة عن خبراتك ودوافعك المهنية...' : 'Write a brief summary of your background and motivation...'}
                    value={answers.notes}
                    onChange={(e) => setAnswers({ ...answers, notes: e.target.value })}
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition shadow-lg shadow-amber-500/10 text-sm"
                  >
                    {lang === 'ar' ? 'إرسال طلب الترشح الآن' : 'Submit Candidate Application'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="px-6 py-3.5 rounded bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition text-sm"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-900 text-center text-slate-400 text-sm">
        <p>&copy; 2026 Sierra Estates. Equal Opportunity Employer & Luxury PropTech Leader.</p>
      </footer>
    </div>
  );
}
