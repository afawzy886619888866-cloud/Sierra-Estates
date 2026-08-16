'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CairoPlazaPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<'overview' | 'towers' | 'inventory' | 'investor'>('overview');
  const [candidateForm, setCandidateForm] = useState({ name: '', phone: '', email: '', interest: 'investor', message: '' });
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
              {lang === 'ar' ? 'مشروعات هامة — كايرو بلازا' : 'Important Projects — Cairo Plaza'}
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
              href="/properties"
              className="px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
            >
              {lang === 'ar' ? 'استعراض العقارات' : 'View Properties'}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {lang === 'ar' ? 'المشروع الأيقوني المميز' : 'Flagship Landmark Project'}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
              {lang === 'ar' ? 'كايرو بلازا — كورنيش النيل' : 'Cairo Plaza — Nile Corniche'}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              {lang === 'ar'
                ? 'مشروع استثماري وإداري تجاري فاخر يتكون من سبعة أبراج مطلة مباشرة على نهر النيل، يجمع بين الفخامة المعمارية والموقع الاستراتيجي في قلب العاصمة.'
                : 'A premier seven-tower waterfront commercial and administrative landmark overlooking the River Nile, combining architectural prestige with a strategic capital location.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#inventory"
                className="px-6 py-3 rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition shadow-lg shadow-amber-500/10"
              >
                {lang === 'ar' ? 'استعراض الوحدات المتاحة' : 'Explore Available Units'}
              </a>
              <a
                href="#investor"
                className="px-6 py-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 font-semibold hover:bg-slate-800 transition"
              >
                {lang === 'ar' ? 'اطلب الملف الاستثماري' : 'Request Investor Pack'}
              </a>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl p-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent pointer-events-none"></div>
            <h3 className="text-xl font-bold text-white mb-4">
              {lang === 'ar' ? 'مؤشرات المشروع الرسمية' : 'Official Project Metrics'}
            </h3>
            <ul className="space-y-4 text-slate-300">
              <li className="flex justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400">{lang === 'ar' ? 'إجمالي الأبراج' : 'Total Towers'}</span>
                <span className="font-semibold text-white">7 {lang === 'ar' ? 'أبراج' : 'Towers'}</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400">{lang === 'ar' ? 'الأبراج المكتملة' : 'Completed Towers'}</span>
                <span className="font-semibold text-amber-400">~3.5 {lang === 'ar' ? 'أبراج' : 'Towers'}</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400">{lang === 'ar' ? 'حالة الوحدات المتاحة' : 'Available Inventory Status'}</span>
                <span className="font-semibold text-emerald-400">{lang === 'ar' ? 'أبراج 1، 2، 3 (جاهزة للاستلام)' : 'Towers 1, 2, 3 (Ready for Handover)'}</span>
              </li>
              <li className="flex justify-between pb-1">
                <span className="text-slate-400">{lang === 'ar' ? 'التصنيف الاستثماري' : 'Investment Classification'}</span>
                <span className="font-semibold text-white">{lang === 'ar' ? 'إداري وتجاري فاخر' : 'Luxury Commercial & Admin'}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-slate-900 border-b border-slate-800 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 flex gap-8 overflow-x-auto">
          {[
            { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview' },
            { id: 'towers', labelAr: 'الأبراج والوضع الإنشائي', labelEn: 'Towers & Status' },
            { id: 'inventory', labelAr: 'الوحدات المتاحة', labelEn: 'Available Inventory' },
            { id: 'investor', labelAr: 'الملف الاستثماري', labelEn: 'Investor Pack' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </section>

      {/* Content Section */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        {activeTab === 'overview' && (
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6">
                {lang === 'ar' ? 'نبذة استراتيجية عن كايرو بلازا' : 'Strategic Overview of Cairo Plaza'}
              </h2>
              <p className="text-slate-300 leading-relaxed text-lg mb-6">
                {lang === 'ar'
                  ? 'يمثل مشروع كايرو بلازا علامة فارقة في المشهد العقاري التجاري والإداري بمصر. بفضل إطلالاته المباشرة على نهر النيل وقربه من المؤسسات الحكومية والمالية الكبرى، يوفر المشروع بيئة عمل متكاملة للمقار الرئيسية للشركات والبنوك والمؤسسات الدولية.'
                  : 'Cairo Plaza stands as a premier landmark in Egypt’s commercial and administrative real estate landscape. With direct Nile views and close proximity to major governmental and financial institutions, it provides an integrated corporate environment for multinational headquarters and premier financial institutions.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-amber-400 font-bold text-xl mb-2">01</div>
                <h4 className="font-semibold text-white mb-2">{lang === 'ar' ? 'موقع استثنائي' : 'Exceptional Location'}</h4>
                <p className="text-slate-400 text-sm">
                  {lang === 'ar' ? 'كورنيش النيل مع سهولة الوصول من كافة محاور القاهرة الكبرى.' : 'Nile Corniche setting with seamless accessibility across Greater Cairo.'}
                </p>
              </div>
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-amber-400 font-bold text-xl mb-2">02</div>
                <h4 className="font-semibold text-white mb-2">{lang === 'ar' ? 'مواصفات عالمية' : 'Global Standards'}</h4>
                <p className="text-slate-400 text-sm">
                  {lang === 'ar' ? 'أنظمة إدارة مباني ذكية، مصاعد فائقة السرعة، ومواقف سيارات واسعة.' : 'Smart building management systems, high-speed elevators, and ample parking.'}
                </p>
              </div>
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-amber-400 font-bold text-xl mb-2">03</div>
                <h4 className="font-semibold text-white mb-2">{lang === 'ar' ? 'عوائد استثمارية قوية' : 'Strong Yields'}</h4>
                <p className="text-slate-400 text-sm">
                  {lang === 'ar' ? 'طلب مرتفع على المساحات الإدارية الكبرى ومعدلات إشغال متميزة.' : 'High corporate demand for large administrative floorplates and robust occupancy.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'towers' && (
          <div className="space-y-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              {lang === 'ar' ? 'حالة الأبراج والتدقيق الإنشائي' : 'Tower Status & Verification Schedule'}
            </h2>
            <p className="text-slate-300 mb-6">
              {lang === 'ar'
                ? 'وفقاً لبيانات التدقيق والتوثيق الرسمية، يتكون المشروع من سبعة أبراج، تم إنجاز حوالي ثلاثة أبراج ونصف حتى الآن، مع تركيز العروض الحالية على الوحدات الجاهزة والمتاحة فعلياً في الأبراج المكتملة.'
                : 'According to official verification schedules, the project comprises seven towers, with approximately three and a half towers completed. Current marketing focuses strictly on ready and verified inventory in completed towers.'}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-sm">
                    <th className="py-4 px-4">{lang === 'ar' ? 'البرج' : 'Tower'}</th>
                    <th className="py-4 px-4">{lang === 'ar' ? 'الحالة الإنشائية' : 'Construction Status'}</th>
                    <th className="py-4 px-4">{lang === 'ar' ? 'حالة المخزون' : 'Inventory Status'}</th>
                    <th className="py-4 px-4">{lang === 'ar' ? 'ملاحظات التدقيق' : 'Verification Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  <tr>
                    <td className="py-4 px-4 font-semibold text-white">Tower 1, 2, 3</td>
                    <td className="py-4 px-4"><span className="text-emerald-400">{lang === 'ar' ? 'مكتمل بالكامل' : 'Fully Completed'}</span></td>
                    <td className="py-4 px-4"><span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs">{lang === 'ar' ? 'متاح حسب الجدول' : 'Available per Schedule'}</span></td>
                    <td className="py-4 px-4 text-slate-400">{lang === 'ar' ? 'جاهز للاستلاستلام الفوري وتسليم التشطيبات' : 'Ready for immediate handover and fit-out'}</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-white">Tower 4</td>
                    <td className="py-4 px-4"><span className="text-amber-400">{lang === 'ar' ? 'مكتمل جزئياً (~50%)' : 'Partially Completed (~50%)'}</span></td>
                    <td className="py-4 px-4"><span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs">{lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}</span></td>
                    <td className="py-4 px-4 text-slate-400">{lang === 'ar' ? 'غير مدرج في العروض الحالية' : 'Excluded from immediate ready offers'}</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-white">Tower 5, 6, 7</td>
                    <td className="py-4 px-4"><span className="text-slate-500">{lang === 'ar' ? 'مرحلة مستقبلية / قيد الإنشاء' : 'Future Phase / Under Construction'}</span></td>
                    <td className="py-4 px-4"><span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs">{lang === 'ar' ? 'غير متاح للبيع الفوري' : 'Not for immediate sale'}</span></td>
                    <td className="py-4 px-4 text-slate-400">{lang === 'ar' ? 'يخضع لتأكيد الجدول الزمني الرسمي' : 'Pending official schedule confirmation'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div id="inventory" className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                  {lang === 'ar' ? 'عينات الوحدات المتاحة في كايرو بلازا' : 'Sample Available Inventory in Cairo Plaza'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {lang === 'ar' ? 'يتم تحديث الوحدات تلقائياً عبر نظام المخزون الحي وربط Airtable.' : 'Inventory synced live via Airtable and Sierra Estates backend.'}
                </p>
              </div>
              <Link
                href="/properties"
                className="px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
              >
                {lang === 'ar' ? 'عرض كافة عقارات الشركة' : 'View All Properties'}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Cairo Plaza — Tower 1 Executive Floor', area: '450 sqm', use: 'Administrative', price: 'EGP 45,000,000', status: 'Ready' },
                { title: 'Cairo Plaza — Tower 2 Nile View Office', area: '280 sqm', use: 'Administrative', price: 'EGP 29,500,000', status: 'Ready' },
                { title: 'Cairo Plaza — Tower 3 Retail Showroom', area: '620 sqm', use: 'Commercial Ground', price: 'EGP 78,000,000', status: 'Ready' },
              ].map((item, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-medium">{item.use}</span>
                      <span className="text-xs text-emerald-400 font-semibold">{item.status}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm mb-4">{item.area}</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-400 mb-4">{item.price}</div>
                    <Link
                      href="/properties"
                      className="block w-full py-2.5 text-center text-xs font-semibold rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                    >
                      {lang === 'ar' ? 'طلب التفاصيل والبروشور' : 'Request Details'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'investor' && (
          <div id="investor" className="max-w-3xl mx-auto space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {lang === 'ar' ? 'اطلب الملف الاستثماري لكايرو بلازا' : 'Request the Cairo Plaza Investor Pack'}
              </h2>
              <p className="text-slate-400 text-sm">
                {lang === 'ar'
                  ? 'احصل على تحليل العائد المتوقع (ROI)، تقارير الإشغال، وجدول الوحدات المتاحة المعتمد رسمياً.'
                  : 'Receive the modeled ROI projections, occupancy reports, and officially verified available inventory schedule.'}
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">
                  {lang === 'ar' ? 'تم استلام طلبك بنجاح!' : 'Request Received Successfully!'}
                </h3>
                <p className="text-slate-300 text-sm">
                  {lang === 'ar'
                    ? 'سيقوم فريق الاستثمار العقاري بالتواصل معك وإرسال الملف الاستثماري عبر البريد الإلكتروني وواتساب.'
                    : 'Our real estate investment team will contact you shortly and dispatch the investor pack via email and WhatsApp.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      placeholder={lang === 'ar' ? 'محمد أحمد' : 'John Doe'}
                      value={candidateForm.name}
                      onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                      placeholder="+20 100 000 0000"
                      value={candidateForm.phone}
                      onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input
                    required
                    type="email"
                    className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="name@example.com"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'الاهتمام الاستثماري' : 'Investment Interest'}</label>
                  <select
                    className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    value={candidateForm.interest}
                    onChange={(e) => setCandidateForm({ ...candidateForm, interest: e.target.value })}
                  >
                    <option value="investor">{lang === 'ar' ? 'مستثمر - وحدات إدارية وتجارية' : 'Investor — Administrative & Commercial'}</option>
                    <option value="corporate">{lang === 'ar' ? 'مقر شركة رئيسي' : 'Corporate Headquarters'}</option>
                    <option value="broker">{lang === 'ar' ? 'شريك ووسيط عقاري' : 'Broker / Channel Partner'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{lang === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    placeholder={lang === 'ar' ? 'مساحة المساحة المطلوبة أو الميزانية...' : 'Required area or budget range...'}
                    value={candidateForm.message}
                    onChange={(e) => setCandidateForm({ ...candidateForm, message: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                >
                  {lang === 'ar' ? 'إرسال الطلب واستلام الملف الاستثماري' : 'Submit & Receive Investor Pack'}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-900 text-center text-slate-400 text-sm">
        <p>&copy; 2026 Sierra Estates. Cairo Plaza Official Marketing & Investment Partner.</p>
      </footer>
    </div>
  );
}
