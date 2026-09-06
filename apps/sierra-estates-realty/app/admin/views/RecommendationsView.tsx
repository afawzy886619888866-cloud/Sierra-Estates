'use client';
/* cspell:disable */

import React, { useState, useMemo } from 'react';

interface RecommendationItem {
  id: string;
  propertyTitle: { en: string; ar: string };
  compound: string;
  leadName: string;
  leadType: 'rental' | 'investment' | 'vip-buyer';
  matchScore: number;
  askingPrice: string;
  monthlyRent?: string;
  rationale: { en: string; ar: string };
  dispatched: boolean;
}

const INITIAL_RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: 'rec-1',
    propertyTitle: { en: 'Mivida 3-Bed Apartment', ar: 'شقة 3 غرف في ميفيدا' },
    compound: 'Mivida',
    leadName: 'Sara Mohamed',
    leadType: 'rental',
    matchScore: 96,
    askingPrice: 'EGP 8,200,000',
    monthlyRent: 'EGP 45,000 / mo',
    rationale: {
      en: 'Matches target budget (EGP 40k-50k), proximity to AUC, and immediate move-in requirement.',
      ar: 'تطابق الميزانية المحددة (40-50 ألف)، القرب من الجامعة الأمريكية، وجاهزية الاستلام الفوري.'
    },
    dispatched: false,
  },
  {
    id: 'rec-2',
    propertyTitle: { en: 'Hyde Park 5-Bed Villa', ar: 'فيلا 5 غرف في هايد بارك' },
    compound: 'Hyde Park',
    leadName: 'Ahmed Al-Rashid',
    leadType: 'vip-buyer',
    matchScore: 92,
    askingPrice: 'EGP 34,500,000',
    rationale: {
      en: 'Matches EGP 35M cash allocation, prime private garden request, and luxury gated security.',
      ar: 'تطابق سيولة نقدية 35 مليون، طلب حديقة خاصة كبيرة، وأمان مجمع سكني فاخر.'
    },
    dispatched: false,
  },
  {
    id: 'rec-3',
    propertyTitle: { en: 'Villette Sky Condos Penthouse', ar: 'بنتهاوس سكاي كوندوز في فيليت سوديك' },
    compound: 'Villette',
    leadName: 'Karim Mansour',
    leadType: 'investment',
    matchScore: 91,
    askingPrice: 'EGP 19,800,000',
    rationale: {
      en: 'Projected net rental yield of 9.4% with expected capital appreciation of 18% YoY.',
      ar: 'عائد إيجاري صافٍ متوقع 9.4% مع نمو رأسمالي سنوي مقدر بنسبة 18%.'
    },
    dispatched: false,
  },
  {
    id: 'rec-4',
    propertyTitle: { en: 'Katameya Dunes Golf View Villa', ar: 'فيلا إطلالة جولف في قطامية ديونز' },
    compound: 'Katameya Dunes',
    leadName: 'Nadia El-Gohary',
    leadType: 'vip-buyer',
    matchScore: 89,
    askingPrice: 'EGP 42,000,000',
    rationale: {
      en: 'Direct golf course frontage with ultra-luxury finishes, matching UHNW buyer brief.',
      ar: 'واجهة مباشرة على ملعب الجولف بتشطيبات فائقة الفخامة تطابق متطلبات العميل المميز.'
    },
    dispatched: false,
  },
];

export default function RecommendationsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(INITIAL_RECOMMENDATIONS);
  const [filterType, setFilterType] = useState<'all' | 'rental' | 'investment' | 'vip-buyer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'dispatched'>('queue');

  const filteredItems = useMemo(() => {
    return recommendations.filter((item) => {
      if (activeTab === 'queue' && item.dispatched) return false;
      if (activeTab === 'dispatched' && !item.dispatched) return false;
      if (filterType !== 'all' && item.leadType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleEn = item.propertyTitle.en.toLowerCase();
        const titleAr = item.propertyTitle.ar.toLowerCase();
        const lead = item.leadName.toLowerCase();
        const compound = item.compound.toLowerCase();
        return titleEn.includes(q) || titleAr.includes(q) || lead.includes(q) || compound.includes(q);
      }
      return true;
    });
  }, [recommendations, filterType, searchQuery, activeTab]);

  const handleDispatch = (id: string) => {
    setRecommendations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dispatched: true } : item))
    );
  };

  const handleRequeue = (id: string) => {
    setRecommendations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dispatched: false } : item))
    );
  };

  return (
    <div className="space-y-6" data-testid="recommendations-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'مركز التوصيات الذكية · المطابقة الآلية' : 'AI Recommendations Hub'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'عروض العقارات المطابقة للعملاء الصادرة من الذكاء الاصطناعي مع التوجيه الفوري لواتساب'
              : 'Real-time property matches, client affinity scores, and automated WhatsApp dispatch queue.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'queue'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {isAr ? 'قائمة الانتظار' : 'Pending Queue'} ({recommendations.filter((r) => !r.dispatched).length})
          </button>
          <button
            onClick={() => setActiveTab('dispatched')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'dispatched'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {isAr ? 'تم الإرسال' : 'Dispatched'} ({recommendations.filter((r) => r.dispatched).length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {(['all', 'vip-buyer', 'investment', 'rental'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                filterType === type
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {type === 'all' && (isAr ? 'الكل' : 'All Types')}
              {type === 'vip-buyer' && (isAr ? 'عملاء VIP' : 'VIP Buyers')}
              {type === 'investment' && (isAr ? 'استثماري' : 'Investment')}
              {type === 'rental' && (isAr ? 'إيجار' : 'Rental')}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder={isAr ? 'بحث بالعميل أو الكمبوند...' : 'Search by lead or compound...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Recommendations Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-sm">
          {isAr ? 'لا توجد توصيات مطابقة للمحددات الحالية.' : 'No recommendations match the selected filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-white text-base">
                    {isAr ? item.propertyTitle.ar : item.propertyTitle.en}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                      {item.leadType === 'vip-buyer' ? (isAr ? '💎 عميل مميز' : '💎 VIP Match') : item.leadType === 'investment' ? (isAr ? '📈 عائد مرتفع' : '📈 High Yield') : (isAr ? '🔑 جاهز للسكن' : '🔑 Immediate Move')}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                        item.matchScore >= 90
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-purple-950/80 text-purple-300 border-purple-800'
                      }`}
                    >
                      {isAr ? `تطابق ${item.matchScore}%` : `Match: ${item.matchScore}%`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-cyan-400 font-medium">{item.compound}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">
                    {isAr ? 'العميل:' : 'Lead:'} <strong className="text-white">{item.leadName}</strong>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-300 font-mono">{item.askingPrice}</span>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
                  {isAr ? item.rationale.ar : item.rationale.en}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500 font-mono">
                  {item.leadType.toUpperCase()}
                </span>

                <div className="flex gap-2">
                  {!item.dispatched ? (
                    <button
                      onClick={() => handleDispatch(item.id)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>💬</span>
                      {isAr ? 'إرسال عبر واتساب' : 'Dispatch WhatsApp'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequeue(item.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                    >
                      {isAr ? 'إعادة للقائمة' : 'Requeue'}
                    </button>
                  )}
                  <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors">
                    {isAr ? 'مراجعة الوسيط' : 'Broker Review'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
