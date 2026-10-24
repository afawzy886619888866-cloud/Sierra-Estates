'use client';
import React, { useState } from 'react';
import { COMPOUNDS, ARTERY_ROADS, Compound } from './registryData';
import { Navigation, Compass, Clock, MapPin, Car, Plane, Building2, Flame } from 'lucide-react';

interface DistanceMatrixProps {
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onLocateCompound: (compound: Compound) => void;
}

export const DistanceMatrix: React.FC<DistanceMatrixProps> = ({
  lang,
  isDarkMode,
  onLocateCompound,
}) => {
  const isAr = lang === 'ar';
  const [selectedOrigin, setSelectedOrigin] = useState<string>('sodic-villette');

  const originCompound = COMPOUNDS.find(c => c.id === selectedOrigin) || COMPOUNDS[0];

  const destinations = [
    {
      id: 'auc',
      nameEn: 'The American University in Cairo [AUC]',
      nameAr: 'الجامعة الأمريكية بالقاهرة [AUC]',
      icon: <Building2 className="w-5 h-5 text-amber-500" />,
      timeMin: originCompound.driveTimeToAucMin,
      km: Math.round(originCompound.driveTimeToAucMin * 1.3),
      arteryEn: '90th Street / AUC Avenue',
      arteryAr: 'شارع التسعين / محور الجامعة الأمريكية',
    },
    {
      id: 'new-capital',
      nameEn: 'New Administrative Capital (NAC)',
      nameAr: 'العاصمة الإدارية الجديدة (NAC)',
      icon: <Building2 className="w-5 h-5 text-sky-500" />,
      timeMin: originCompound.driveTimeToNewCapitalMin,
      km: Math.round(originCompound.driveTimeToNewCapitalMin * 1.6),
      arteryEn: 'Middle Ring Road & Bin Zayed Axis',
      arteryAr: 'الدائري الأوسطي ومحور بن زايد',
    },
    {
      id: 'airport',
      nameEn: 'Cairo International Airport (CAI)',
      nameAr: 'مطار القاهرة الدولي (CAI)',
      icon: <Plane className="w-5 h-5 text-emerald-500" />,
      timeMin: originCompound.driveTimeToAirportMin,
      km: Math.round(originCompound.driveTimeToAirportMin * 1.5),
      arteryEn: 'Suez Desert Road / Ring Road',
      arteryAr: 'طريق السويس الصحراوي / الطريق الدائري',
    },
    {
      id: 'sokhna',
      nameEn: 'Ain Sokhna Red Sea Port & Beaches',
      nameAr: 'شواطئ وميناء العين السخنة',
      icon: <Flame className="w-5 h-5 text-orange-500" />,
      timeMin: 55,
      km: 88,
      arteryEn: 'Katameya - Ain Sokhna Expressway',
      arteryAr: 'طريق القطامية - العين السخنة السريع',
    },
  ];

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 py-8 ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>
      
      {/* Header */}
      <div className="pb-6 border-b border-amber-900/20 dark:border-amber-500/20">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">
          <span>{isAr ? 'مصفوفة الاتصال والمسافات' : 'AUC RADIAL TRANSIT MATRIX'}</span>
          <span>·</span>
          <span>CONCENTRIC INFRASTRUCTURE ANALYSIS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-cinzel text-stone-900 dark:text-white">
          {isAr ? 'رادار المسافات وزمن الوصول من مركز الجامعة الأمريكية' : 'AUC Central Radar & Regional Transit Matrix'}
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300 max-w-2xl">
          {isAr
            ? 'تستند خريطة الماستر بلان إلى مركز الجامعة الأمريكية بالقاهرة كنقطة ارتكاز جغرافية محاطة بحلقات شعاعية تحدد زمن الوصول لجميع المشروعات والمحاور الرئيسية.'
            : 'The master registry cartography uses the AUC Campus (30.0197° N, 31.4988° E) as the radial epicenter, calculating commute isochrones across all primary eastern expressways.'
          }
        </p>
      </div>

      {/* Interactive Origin Selector */}
      <div className="my-6 p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">
            {isAr ? 'اختر نقطة البداية (المشروع أو الكمبوند):' : 'Select Origin Compound:'}
          </label>
          <select
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
            className="px-3 py-2 text-sm font-semibold rounded-md border border-amber-600/40 bg-[#FAF8F5] dark:bg-stone-850 text-stone-900 dark:text-white focus:outline-hidden focus:border-amber-600"
          >
            {COMPOUNDS.map(c => (
              <option key={c.id} value={c.id}>
                {c.nameEn} ({c.zoneEn}) — {c.nameAr}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onLocateCompound(originCompound)}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors shadow-xs flex items-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>{isAr ? 'تحديد على الخريطة الرئيسية' : 'Locate Origin on Master Map'}</span>
        </button>
      </div>

      {/* 4 Primary Destination Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {destinations.map(d => (
          <div
            key={d.id}
            className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 w-fit mb-3">
                {d.icon}
              </div>
              <h3 className="text-sm font-bold font-cinzel text-stone-900 dark:text-white">
                {isAr ? d.nameAr : d.nameEn}
              </h3>
              <p className="text-[11px] text-stone-500 font-mono mt-1">
                {isAr ? d.arteryAr : d.arteryEn}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-end justify-between">
              <div>
                <span className="text-[10px] text-stone-400 font-mono uppercase block">{isAr ? 'زمن القيادة' : 'Drive Time'}</span>
                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {d.timeMin} <span className="text-xs font-normal">min</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 font-mono uppercase block">{isAr ? 'المسافة' : 'Distance'}</span>
                <span className="text-sm font-mono font-bold text-stone-700 dark:text-stone-300">
                  ~{d.km} km
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comprehensive Concentric Proximity Table */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        <div className="p-4 bg-[#F8F5EE] dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <span className="text-xs font-bold font-cinzel tracking-wider uppercase text-stone-800 dark:text-stone-200">
            {isAr ? 'جدول القرب النسبي لجميع مشروعات السجل العقاري من مركز AUC' : 'Comprehensive AUC Proximity Index for All Mapped Compounds'}
          </span>
          <span className="text-[11px] font-mono text-stone-500">
            Sorted by AUC Proximity
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-stone-200 dark:border-stone-800 text-[11px] font-mono font-semibold text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-850">
              <tr>
                <th className="py-2.5 px-4">{isAr ? 'المشروع' : 'Compound'}</th>
                <th className="py-2.5 px-4">{isAr ? 'المنطقة والموقع' : 'Zone'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'زمن AUC' : 'AUC Drive'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'العاصمة الإدارية' : 'New Capital'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'مطار القاهرة' : 'Airport'}</th>
                <th className="py-2.5 px-4">{isAr ? 'المحور الرئيسي المباشر' : 'Primary Access Corridor'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {[...COMPOUNDS].sort((a, b) => a.driveTimeToAucMin - b.driveTimeToAucMin).map(c => (
                <tr key={c.id} className="hover:bg-amber-50/40 dark:hover:bg-stone-850 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-stone-900 dark:text-stone-100 font-cinzel">
                    {c.nameEn}
                    <span className="block text-[10px] font-cairo font-normal text-stone-500">{c.nameAr}</span>
                  </td>
                  <td className="py-2.5 px-4 text-stone-600 dark:text-stone-300">
                    {isAr ? c.zoneAr : c.zoneEn}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                    {c.driveTimeToAucMin} min
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-stone-700 dark:text-stone-300">
                    {c.driveTimeToNewCapitalMin} min
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-stone-700 dark:text-stone-300">
                    {c.driveTimeToAirportMin} min
                  </td>
                  <td className="py-2.5 px-4 text-[11px] text-stone-500 font-mono">
                    {c.zoneEn.includes('Suez') ? 'Suez Expressway' : c.zoneEn.includes('Golden Square') ? 'South 90th & Clubs Axis' : 'Middle Ring & Sokhna Axis'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
