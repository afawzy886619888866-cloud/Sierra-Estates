'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CareersPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [selectedRole, setSelectedRole] = useState<'sales' | 'admin' | null>(null);
  const [answers, setAnswers] = useState({
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
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
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
            {lang === 'ar' ? 'ابنِ مستقبلك المهني معنا' : 'Build Your Career With Us'}
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            {lang === 'ar'
              ? 'نحن نبحث عن الكفاءات المتميزة في قطاع المبيعات الفاخرة والإدارة التنفيذية للانضمام إلى توسعاتنا في القاهرة الجديدة والعاصمة الإدارية.'
              : 'We are seeking exceptional talents in luxury sales and executive administration to join our expanding operations across New Cairo and the New Administrative Capital.'}
          </p>
        </div>
      </section>

      {/* Job Descriptions & Landing Questions */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Sales Role Card */}
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-semibold">
                  {lang === 'ar' ? 'دوام كامل' : 'Full Time'}
                </span>
                <span className="text-xs text-slate-400">New Cairo, Egypt</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {lang === 'ar' ? 'مستشار عقاري أول — مبيعات فاخرة' : 'Senior Real Estate Consultant — Luxury Sales'}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {lang === 'ar'
                  ? 'مسؤول عن إدارة علاقات كبار العملاء، تقديم الاستشارات العقارية في المشروعات الكبرى مثل كايرو بلازا والتجمع الخامس، وإغلاق الصفقات الاستثمارية بكفاءة عالية.'
                  : 'Responsible for managing VIP client relationships, providing expert advisory in flagship projects like Cairo Plaza and New Cairo, and closing high-value investment transactions.'}
              </p>
              <div className="space-y-2 mb-8 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span> {lang === 'ar' ? 'خبرة لا تقل عن 3 سنوات في السوق العقاري' : 'Minimum 3 years Cairo real estate experience'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span> {lang === 'ar' ? 'مهارات تفاوض وإقناع استثنائية' : 'Exceptional negotiation & closing skills'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span> {lang === 'ar' ? 'إجادة اللغتين العربية والإنجليزية بطلاقة' : 'Fluent Arabic & English communication'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedRole('sales')}
              className={`w-full py-3 rounded font-semibold text-xs transition ${
                selectedRole === 'sales'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {lang === 'ar' ? 'تقديم على وظيفة المبيعات' : 'Apply for Sales Role'}
            </button>
          </div>

          {/* Admin Role Card */}
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold">
                  {lang === 'ar' ? 'دوام كامل' : 'Full Time'}
                </span>
                <span className="text-xs text-slate-400">New Cairo, Egypt</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {lang === 'ar' ? 'مسؤول العمليات والإدارة التنفيذية' : 'Executive Operations & Admin Officer'}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {lang === 'ar'
                  ? 'مسؤول عن تنظيم العمليات الداخلية، إدارة مخزون العقارات عبر النظام، متابعة العقود والعلاقات مع الوسطاء، ودعم الفريق التنفيذي.'
                  : 'Responsible for organizing internal operations, managing inventory records, coordinating contracts and broker relations, and supporting the executive leadership.'}
              </p>
              <div className="space-y-2 mb-8 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> {lang === 'ar' ? 'إجادة استخدام أنظمة CRM و Excel المتقدمة' : 'Proficiency in CRM & advanced Excel'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> {lang === 'ar' ? 'تنظيم دقيق ومهارات حل المشكلات' : 'Rigorous organization & problem-solving'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> {lang === 'ar' ? 'خبرة سنتين على الأقل في الإدارة' : 'At least 2 years administrative experience'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedRole('admin')}
              className={`w-full py-3 rounded font-semibold text-xs transition ${
                selectedRole === 'admin'
                  ? 'bg-blue-500 text-slate-950'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {lang === 'ar' ? 'تقديم على الوظيفة الإدارية' : 'Apply for Admin Role'}
            </button>
          </div>
        </div>

        {/* Candidate Application Questionnaire */}
        {selectedRole && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === 'ar'
                  ? `استمارة الترشح لفرصة: ${selectedRole === 'sales' ? 'مستشار مبيعات' : 'إدارة العمليات'}`
                  : `Application Form: ${selectedRole === 'sales' ? 'Sales Consultant' : 'Operations Admin'}`}
              </h3>
              <button
                onClick={() => setSelectedRole(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {lang === 'ar' ? 'إغلاق ✕' : 'Close ✕'}
              </button>
            </div>

            {submitted ? (
              <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <h4 className="text-lg font-bold text-emerald-400 mb-2">
                  {lang === 'ar' ? 'تم استلام طلب ترشحك بنجاح!' : 'Application Submitted Successfully!'}
                </h4>
                <p className="text-slate-300 text-sm">
                  {lang === 'ar'
                    ? 'سيقوم فريق الموارد البشرية بمراجعة إجاباتك وسيرتك الذاتية والتواصل معك قريباً لتحديد موعد المقابلة.'
                    : 'Our HR team will review your qualifications and contact you shortly for an interview.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input required type="text" className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500" placeholder="أحمد محمد" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
                    <input required type="text" className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500" placeholder="+20 100 000 0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input required type="email" className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500" placeholder="name@example.com" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'سنوات الخبرة في المجال' : 'Years of Experience'}</label>
                    <select
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500"
                      value={answers.experience}
                      onChange={(e) => setAnswers({ ...answers, experience: e.target.value })}
                    >
                      <option value="1-2">1 - 2 {lang === 'ar' ? 'سنوات' : 'years'}</option>
                      <option value="3-5">3 - 5 {lang === 'ar' ? 'سنوات' : 'years'}</option>
                      <option value="5+">5+ {lang === 'ar' ? 'سنوات فأكثر' : 'years or more'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'مدى الإلمام بالسوق العقاري المصري' : 'Egyptian Real Estate Fluency'}</label>
                    <select
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500"
                      value={answers.realEstateKnowledge}
                      onChange={(e) => setAnswers({ ...answers, realEstateKnowledge: e.target.value })}
                    >
                      <option value="expert">{lang === 'ar' ? 'خبير (القاهرة الجديدة والعاصمة)' : 'Expert (New Cairo & Capital)'}</option>
                      <option value="good">{lang === 'ar' ? 'متوسط' : 'Moderate'}</option>
                      <option value="beginner">{lang === 'ar' ? 'مبتدئ / استعداد للتعلم' : 'Junior / Eager to Learn'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'القدرة على البدء' : 'Availability to Start'}</label>
                  <select
                    className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500"
                    value={answers.availability}
                    onChange={(e) => setAnswers({ ...answers, availability: e.target.value })}
                  >
                    <option value="immediate">{lang === 'ar' ? 'فورا' : 'Immediate'}</option>
                    <option value="two-weeks">{lang === 'ar' ? 'خلال أسبوعين' : 'Within 2 weeks'}</option>
                    <option value="one-month">{lang === 'ar' ? 'خلال شهر' : 'Within a month'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'لماذا ترغب في الانضمام إلى Sierra Estates؟' : 'Why do you want to join Sierra Estates?'}</label>
                  <textarea
                    rows={3}
                    required
                    className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-amber-500"
                    placeholder={lang === 'ar' ? 'اكتب نبذة موجزة عن دافعك المهني...' : 'Write a brief note about your professional motivation...'}
                    value={answers.notes}
                    onChange={(e) => setAnswers({ ...answers, notes: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                >
                  {lang === 'ar' ? 'إرسال طلب التوظيف' : 'Submit Application'}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-900 text-center text-slate-400 text-sm">
        <p>&copy; 2026 Sierra Estates. Equal Opportunity Employer.</p>
      </footer>
    </div>
  );
}
