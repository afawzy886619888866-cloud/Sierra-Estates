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

// ANTI-FABRICATION (§21 wave 5): four fabricated demo leads with invented
// names, match scores, prices and yield rationales were previously rendered
// here as if the matching engine had produced them. Real recommendations
// must come from the matching engine / CRM — until one is wired in, the hub
// starts honestly empty. (Same treatment as LEADS_DATA and the Stage-9
// closer board.)
const INITIAL_RECOMMENDATIONS: RecommendationItem[] = [];

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
                ? 'bg-[#C8961A] text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {isAr ? 'قائمة الانتظار' : 'Pending Queue'} ({recommendations.filter((r) => !r.dispatched).length})
          </button>
          <button
            onClick={() => setActiveTab('dispatched')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'dispatched'
                ? 'bg-[#C8961A] text-white'
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
          className="w-full sm:w-64 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8961A]"
        />
      </div>

      {/* Recommendations Grid */}
      {recommendations.length === 0 ? (
        <div
          data-testid="recommendations-empty-state"
          className="p-10 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2"
        >
          <div className="text-slate-300 text-sm font-semibold">
            {isAr ? 'لا توجد توصيات بعد' : 'No recommendations yet'}
          </div>
          <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'لم يُنتج محرك المطابقة أي توصيات حتى الآن. عند توليد توصيات حقيقية للعملاء ستظهر هنا — لا يتم اختراع توصيات تجريبية.'
              : 'The matching engine has not produced any recommendations yet. Real generated recommendations will appear here — demo recommendations are never invented.'}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
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
                  <span className="text-[#E9C176] font-medium">{item.compound}</span>
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
                      className="px-3 py-1.5 bg-[#C8961A] hover:bg-[#C8961A] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
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
