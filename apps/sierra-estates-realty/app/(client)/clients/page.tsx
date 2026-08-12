'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Building2,
  MapPin,
  DollarSign,
  BedDouble,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Compass,
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/client/Navbar';
import { Footer } from '@/components/client/Footer';
import ModelViewer from '@/components/client/ModelViewer';
import { useI18n } from '@/lib/i18n-client';

const PROPERTY_TYPES = [
  { id: 'apartment', labelEn: 'Apartment', labelAr: 'شقة' },
  { id: 'villa', labelEn: 'Standalone Villa', labelAr: 'فيلا مستقلة' },
  { id: 'townhouse', labelEn: 'Townhouse', labelAr: 'تاون هاوس' },
  { id: 'twinhouse', labelEn: 'Twin House', labelAr: 'توين هاوس' },
  { id: 'penthouse', labelEn: 'Penthouse', labelAr: 'بنتهاوس' },
  { id: 'duplex', labelEn: 'Duplex', labelAr: 'دوبلكس' },
];

const POPULAR_COMPOUNDS = [
  'Mivida',
  'Hyde Park',
  'Katameya Dunes',
  'Mountain View iCity',
  'Villette',
  'Palm Hills New Cairo',
  'Taj City',
  'Eastown',
  'Golden Square',
  '5th Settlement',
];

export default function ClientRequestPage() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    type: 'apartment',
    area: '',
    budget: '',
    rooms: '3',
    name: '',
    phone: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError(
        isAr
          ? 'الرجاء إدخال الاسم ورقم الهاتف للتواصل'
          : 'Please enter your name and phone number'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (db) {
        await addDoc(collection(db, 'inquiries'), {
          ...formData,
          source: 'clients_request_portal',
          status: 'S1_NEW_LEAD',
          createdAt: serverTimestamp(),
        });
      } else {
        // Fallback simulate success if db uninitialized
        await new Promise((res) => setTimeout(res, 800));
      }
      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setError(
        isAr
          ? 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while submitting your request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wide uppercase mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isAr ? 'الخدمة الاستشارية الشخصية' : 'VIP Concierge Sourcing'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-display leading-[1.1] mb-6">
              {isAr ? (
                <>
                  اعثر على عقارك المثالي في <span className="gold-gradient-text">التجمع الخامس</span>
                </>
              ) : (
                <>
                  Find Your Premier Property in <span className="gold-gradient-text">New Cairo</span>
                </>
              )}
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
              {isAr
                ? 'قدم مواصفات عقارك المطلوب وسيقوم مستشارو سييرا إستيتس بالبحث واختيار أفضل الفرص الحصرية غير المعروضة بالعلن بأفضل سعر.'
                : 'Submit your tailored requirements. Sierra Estates AI and licensed advisors match off-market inventory across 52+ premium compounds.'}
            </p>

            {/* Quick Metrics Pills */}
            <div className="flex flex-wrap items-center gap-6 mt-8 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'رد خلال 15 دقيقة' : '15-min Average Response'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'عقود موثقة ومعاينة مباشرة' : 'Verified Contracts & Live Tours'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'تغطية لكافة مجمعات التجمع' : '52 New Cairo Compounds'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Request Form Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form Container */}
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-2xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center py-12 space-y-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white font-display">
                        {isAr ? 'تم استلام طلبك بنجاح' : 'Request Received Successfully'}
                      </h2>
                      <p className="text-sm text-slate-400 max-w-md mx-auto">
                        {isAr
                          ? 'قام فريقنا بتسجيل تفاصيل طلبك. سيتم التواصل معك عبر الواتساب/الهاتف خلال دقائق بقائمة العقارات المطابقة.'
                          : 'Our luxury real estate advisor will match your specifications and contact you via Phone/WhatsApp shortly.'}
                      </p>
                    </div>
                    <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => {
                          setSuccess(false);
                          setFormData({
                            type: 'apartment',
                            area: '',
                            budget: '',
                            rooms: '3',
                            name: '',
                            phone: '',
                            notes: '',
                          });
                        }}
                        className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-sm font-semibold text-white transition btn-tactile"
                      >
                        {isAr ? 'إرسال طلب جديد' : 'Submit Another Request'}
                      </button>
                      <Link
                        href="/"
                        className="px-6 py-3 rounded-xl gold-gradient text-slate-950 font-bold text-sm gold-glow hover:opacity-90 transition btn-tactile inline-flex items-center justify-center gap-2"
                      >
                        <span>{isAr ? 'العودة للرئيسية' : 'Explore Properties'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                      <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>{isAr ? 'تفاصيل العقار المطلوب' : 'Property Requirements'}</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        {isAr
                          ? 'حدد النوع والموقع والميزانية المناسبة لك'
                          : 'Select your target type, compound area, and investment range'}
                      </p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <span className="flex-1">{error}</span>
                      </div>
                    )}

                    {/* Property Type Grid */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        {isAr ? 'نوع العقار' : 'Property Type'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {PROPERTY_TYPES.map((pt) => {
                          const active = formData.type === pt.id;
                          return (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, type: pt.id })}
                              className={`p-3 rounded-xl border text-xs font-semibold text-left transition flex items-center justify-between ${
                                active
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <span>{isAr ? pt.labelAr : pt.labelEn}</span>
                              {active && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Target Area / Compound */}
                    <div className="space-y-3">
                      <label htmlFor="area-input" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        {isAr ? 'الكمبوند أو المنطقة المفضلة' : 'Target Compound / Area'}
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          id="area-input"
                          type="text"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                          placeholder={
                            isAr
                              ? 'مثال: ميفيدا، هايد بارك، المربع الذهبي...'
                              : 'e.g. Mivida, Hyde Park, Golden Square...'
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                      {/* Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {POPULAR_COMPOUNDS.slice(0, 5).map((cpd) => (
                          <button
                            key={cpd}
                            type="button"
                            onClick={() => setFormData({ ...formData, area: cpd })}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-[11px] text-slate-400 hover:text-amber-300 transition"
                          >
                            + {cpd}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget & Bedrooms Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Budget */}
                      <div className="space-y-2">
                        <label htmlFor="budget-input" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          {isAr ? 'الميزانية المتوقعة (جنيه مصري)' : 'Budget Range (EGP)'}
                        </label>
                        <div className="relative">
                          <DollarSign className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5 pointer-events-none" />
                          <input
                            id="budget-input"
                            type="text"
                            value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            placeholder={isAr ? 'مثال: 10M - 15M' : 'e.g. 10,000,000'}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      </div>

                      {/* Rooms */}
                      <div className="space-y-2">
                        <label htmlFor="rooms-select" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          {isAr ? 'عدد الغرف' : 'Bedrooms'}
                        </label>
                        <div className="relative">
                          <BedDouble className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5 pointer-events-none" />
                          <select
                            id="rooms-select"
                            value={formData.rooms}
                            onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition appearance-none"
                          >
                            <option value="1">1 {isAr ? 'غرفة' : 'Bedroom'}</option>
                            <option value="2">2 {isAr ? 'غرفتان' : 'Bedrooms'}</option>
                            <option value="3">3 {isAr ? '3 غرف' : 'Bedrooms'}</option>
                            <option value="4">4 {isAr ? '4 غرف' : 'Bedrooms'}</option>
                            <option value="5+">5+ {isAr ? 'أكثر من 5 غرف' : 'Bedrooms'}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <hr className="border-slate-800/80 my-6" />

                    {/* Contact Info Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                        {isAr ? 'بيانات التواصل الشخصية' : 'Your Contact Details'}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="space-y-2">
                          <label htmlFor="name-input" className="text-xs font-medium text-slate-400 block">
                            {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                            <input
                              id="name-input"
                              type="text"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder={isAr ? 'أدخل اسمك الكريم' : 'Your full name'}
                              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                          <label htmlFor="phone-input" className="text-xs font-medium text-slate-400 block">
                            {isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}
                          </label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                            <input
                              id="phone-input"
                              type="tel"
                              required
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder={isAr ? '010XXXXXXXX' : '+20 10X XXX XXXX'}
                              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 rounded-xl gold-gradient text-slate-950 font-bold text-base gold-glow hover:opacity-90 transition btn-tactile disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                      {loading ? (
                        <span>{isAr ? 'جاري إرسال الطلب...' : 'Submitting Request...'}</span>
                      ) : (
                        <>
                          <span>{isAr ? 'إرسال طلب البحث الآن' : 'Start Exclusive Search'}</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Info Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            {/* 3D Property Interactive Experience */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold px-1 text-slate-400">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAr ? 'معاينة تفاعلية 3D' : 'Interactive 3D Architectural Preview'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Three.js / GLTF</span>
              </div>
              <ModelViewer className="h-[260px] w-full" />
            </div>

            {/* Sierra Advantage Card */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
              <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>{isAr ? 'لماذا تختار سييرا إستيتس؟' : 'The Sierra Advantage'}</span>
              </h3>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {isAr ? 'تقييم ذكي ومطابقة فورية' : 'AI-Scored Market Matching'}
                    </h4>
                    <p className="text-slate-400 mt-0.5">
                      {isAr
                        ? 'نستخدم خوارزميات ذكاء اصطناعي لتحليل أسعار السوق وحساب عائد الاستثمار لكل وحدة.'
                        : 'Our proprietary engine evaluates 12 valuation points to deliver verified opportunities.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {isAr ? 'وصول حصري للوحدات غير المعروضة' : 'Off-Market Access'}
                    </h4>
                    <p className="text-slate-400 mt-0.5">
                      {isAr
                        ? 'شبكتنا تشمل وحدات إعادة بيع وإيجار مباشرة من الملاك في التجمع الخامس.'
                        : 'Gain priority access to private listings before public market exposure.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {isAr ? 'مستشار عقاري مرخص' : 'Licensed Real Estate Brokerage'}
                    </h4>
                    <p className="text-slate-400 mt-0.5">
                      {isAr
                        ? 'نضمن لك سلامة الأوراق والمستندات القانونية وإتمام الصفقة بكل أمان.'
                        : 'Complete transparency, legal title verification, and end-to-end transaction care.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Contact Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-center space-y-4">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">
                {isAr ? 'هل تفضل التحدث المباشر؟' : 'Prefer Immediate Consultation?'}
              </p>
              <div className="text-lg font-bold text-white font-mono dir-ltr">
                +20 109 204 8333
              </div>
              <a
                href="https://wa.me/201092048333"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition btn-tactile shadow-lg shadow-emerald-900/30 w-full"
              >
                <span>{isAr ? 'تواصل عبر واتساب فوراً' : 'Chat via WhatsApp'}</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
