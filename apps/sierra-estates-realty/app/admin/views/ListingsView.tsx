'use client';
import React from 'react';

export default function ListingsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'قاعدة بيانات العقارات · إدارة المخزون' : 'Luxury Inventory & Listings Hub'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'عرض وتعديل ومزامنة العقارات مع PropertyFinder وقواعد بيانات التجمع الخامس' : 'View, edit, filter, and synchronize verified New Cairo properties with PropertyFinder and internal feeds.'}
          </p>
        </div>
        <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-md">
          {isAr ? '+ إضافة عقار جديد' : '+ Add Listing'}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
