'use client';
import React, { useState } from 'react';
import { UnitListing, Compound, COMPOUNDS } from './registryData';
import { X, CheckCircle2, ShieldCheck, Calendar, Phone, Mail, User, Building } from 'lucide-react';

interface VipInquiryModalProps {
  onClose: () => void;
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  selectedUnit?: UnitListing | null;
  selectedCompound?: Compound | null;
}

export const VipInquiryModal: React.FC<VipInquiryModalProps> = ({
  onClose,
  lang,
  isDarkMode,
  selectedUnit,
  selectedCompound,
}) => {
  const isAr = lang === 'ar';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredCompound, setPreferredCompound] = useState(
    selectedCompound?.nameEn || selectedUnit?.compoundNameEn || 'SODIC VILLETTE'
  );
  const [preferredDate, setPreferredDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refCode = 'SE-VIP-' + Math.floor(100000 + Math.random() * 900000);
    setBookingRef(refCode);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode ? 'bg-[#0A1220] border-amber-500/30 text-stone-100' : 'bg-[#FAF8F5] border-amber-600/30 text-stone-900'
      }`}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-700 dark:text-amber-400 font-cinzel font-bold text-xs">
              S
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-amber-700 dark:text-amber-400 uppercase font-semibold">
                {isAr ? 'خدمة كبار العملاء والمستثمرين' : 'SIERRA PRIVATE CLIENT DESK'}
              </div>
              <div className="text-base font-bold font-cinzel text-stone-900 dark:text-white">
                {isAr ? 'حجز معاينة واستشارة عقارية خاصة' : 'Schedule VIP Site Consultation'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mx-auto flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-cinzel text-stone-900 dark:text-white">
                {isAr ? 'تم استلام طلبكم بنجاح' : 'Viewing Request Confirmed'}
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 max-w-sm mx-auto leading-relaxed">
                {isAr 
                  ? 'سيتواصل معكم مستشار الاستثمار العقاري الخاص من سيرّا إستيتس عبر الهاتف أو واتساب لتأكيد تفاصيل الزيارة الميدانية وتوفير الملف المعماري.'
                  : 'A Senior Private Client Advisor from Sierra Estates will contact you via phone/WhatsApp within 2 business hours to arrange private site access.'
                }
              </p>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono inline-block">
                <span className="text-stone-400">{isAr ? 'رقم الحجز المرجعي:' : 'Booking Reference:'} </span>
                <span className="font-bold text-amber-700 dark:text-amber-400">{bookingRef}</span>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-xs font-semibold rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 cursor-pointer"
                >
                  {isAr ? 'العودة للخريطة' : 'Return to Master Registry'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {selectedUnit && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                  <span className="font-mono text-stone-600 dark:text-stone-300">
                    {isAr ? 'الوحدة المحددة:' : 'Selected Unit:'} <strong className="text-amber-800 dark:text-amber-300">{selectedUnit.unitCode}</strong> ({selectedUnit.typeEn})
                  </span>
                  <span className="font-mono font-bold text-stone-900 dark:text-white">
                    EGP {(selectedUnit.resalePriceEgp / 1000000).toFixed(1)}M
                  </span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-stone-600 dark:text-stone-300 font-medium mb-1">
                  {isAr ? 'الاسم بالكامل' : 'Full Name'} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isAr ? 'مثال: م. أحمد فوزي' : 'e.g. Eng. Ahmed Fawzy'}
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 focus:outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Phone / WhatsApp */}
              <div>
                <label className="block text-stone-600 dark:text-stone-300 font-medium mb-1">
                  {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'} *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 focus:outline-hidden focus:border-amber-600 font-mono"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-stone-600 dark:text-stone-300 font-medium mb-1">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@investment.com"
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 focus:outline-hidden focus:border-amber-600 font-mono"
                  />
                </div>
              </div>

              {/* Preferred Compound */}
              <div>
                <label className="block text-stone-600 dark:text-stone-300 font-medium mb-1">
                  {isAr ? 'المشروع المطلوب للمعاينة' : 'Project of Interest'}
                </label>
                <select
                  value={preferredCompound}
                  onChange={(e) => setPreferredCompound(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:border-amber-600"
                >
                  {COMPOUNDS.map(c => (
                    <option key={c.id} value={c.nameEn}>{c.nameEn} ({c.zoneEn})</option>
                  ))}
                </select>
              </div>

              {/* Preferred Date */}
              <div>
                <label className="block text-stone-600 dark:text-stone-300 font-medium mb-1">
                  {isAr ? 'الموعد المفضل للزيارة أو الاتصال' : 'Preferred Date & Time'}
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 focus:outline-hidden focus:border-amber-600 font-mono"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-bold tracking-wider uppercase text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-md shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAr ? 'تأكيد طلب الزيارة الحصرية' : 'Submit Confidential Request'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
