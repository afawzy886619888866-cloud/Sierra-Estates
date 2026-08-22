'use client';

import React, { useState } from 'react';
import EasyListingStudio from '@/components/admin/EasyListingStudio';
import { Sparkles, ListFilter, PlusCircle } from 'lucide-react';

export default function ListingsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'inventory' | 'easy-listing'>('easy-listing');

  return (
    <div className="space-y-6">
      {/* Top Header & Subnav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'قاعدة بيانات العقارات والمخزون الحصري' : 'Luxury Inventory & Listings Hub'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'إدارة العقارات والتحليل التلقائي السريع للإعلانات عبر الذكاء الاصطناعي'
              : 'View verified New Cairo properties and use AI Scribe for instant 1-click Easy Listing intake.'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('easy-listing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'easy-listing'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'الإدراج السريع الذكي' : 'Easy Listing Studio'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>{isAr ? 'جميع العقارات' : 'All Listings'}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Easy Listing Studio */}
      {activeTab === 'easy-listing' && (
        <EasyListingStudio lang={lang} onListingPublished={() => setActiveTab('inventory')} />
      )}

      {/* Tab 2: Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400">Verified Units in Database</span>
            <button
              onClick={() => setActiveTab('easy-listing')}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isAr ? '+ إضافة عقار جديد' : '+ Easy Add Listing'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Compound</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">AI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-cyan-400">SE-HYP-VLA-0040</td>
                  <td className="p-3">Hyde Park</td>
                  <td className="p-3">Standalone Villa</td>
                  <td className="p-3 font-semibold text-white">EGP 35,000,000</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span></td>
                  <td className="p-3 text-purple-400 font-bold">9.8 / 10</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-cyan-400">SE-MVD-APT-0041</td>
                  <td className="p-3">Mivida</td>
                  <td className="p-3">Apartment</td>
                  <td className="p-3 font-semibold text-white">EGP 14,500,000</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span></td>
                  <td className="p-3 text-purple-400 font-bold">9.5 / 10</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-cyan-400">SE-VLT-TWN-0042</td>
                  <td className="p-3">Villette SODIC</td>
                  <td className="p-3">Townhouse</td>
                  <td className="p-3 font-semibold text-white">EGP 19,800,000</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span></td>
                  <td className="p-3 text-purple-400 font-bold">9.6 / 10</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
