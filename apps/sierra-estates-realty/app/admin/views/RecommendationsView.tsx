'use client';
import React from 'react';

export default function RecommendationsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'مركز التوصيات الذكية · المطابقة الآلية' : 'AI Recommendations Hub'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'عروض العقارات المطابقة للعملاء الصادرة من الذكاء الاصطناعي' : 'Real-time property matches, client affinity scores, and automated WhatsApp dispatch queue.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">Mivida 3-Bed Apartment</span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">Match: 96%</span>
          </div>
          <p className="text-xs text-slate-400">Matched to Lead: Sara Mohamed (Looking for Rent in 5th Settlement)</p>
          <div className="flex gap-2 pt-2">
            <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg">
              {isAr ? 'إرسال عبر واتساب' : 'Dispatch WhatsApp'}
            </button>
            <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg">
              {isAr ? 'مراجعة الوسيط' : 'Broker Review'}
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">Hyde Park 5-Bed Villa</span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">Match: 92%</span>
          </div>
          <p className="text-xs text-slate-400">Matched to Lead: Ahmed Al-Rashid (VIP Cash Buyer EGP 35M)</p>
          <div className="flex gap-2 pt-2">
            <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg">
              {isAr ? 'إرسال عبر واتساب' : 'Dispatch WhatsApp'}
            </button>
            <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg">
              {isAr ? 'مراجعة الوسيط' : 'Broker Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
