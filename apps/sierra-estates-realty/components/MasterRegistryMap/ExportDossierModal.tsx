'use client';
import React from 'react';
import { COMPOUNDS, UNIT_LISTINGS, REGISTRY_STATS } from './registryData';
import { X, Printer, Download, CheckCircle, ShieldCheck, QrCode } from 'lucide-react';

interface ExportDossierModalProps {
  onClose: () => void;
  lang: 'en' | 'ar';
  isDarkMode: boolean;
}

export const ExportDossierModal: React.FC<ExportDossierModalProps> = ({
  onClose,
  lang,
  isDarkMode,
}) => {
  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
        isDarkMode ? 'bg-[#0A1220] border-amber-500/30 text-stone-100' : 'bg-[#FAF8F5] border-amber-600/30 text-stone-900'
      }`}>
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-amber-700 dark:text-amber-400 uppercase font-bold">
              {isAr ? 'التقرير العقاري التنفيذي المطبوع' : 'CONFIDENTIAL EXECUTIVE REAL ESTATE DOSSIER'}
            </div>
            <div className="text-xl font-bold font-cinzel text-stone-900 dark:text-white">
              {isAr ? 'الملف الاستثماري للقاهرة الجديدة' : 'New Cairo City Master Registry Dossier'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة' : 'Print / Save PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-8 font-sans">
          
          {/* Document Cover Header */}
          <div className="border-b-2 border-amber-600/40 pb-6 flex items-start justify-between">
            <div>
              <div className="w-10 h-10 rounded-full border border-amber-600 flex items-center justify-center font-cinzel text-lg font-bold text-amber-700 mb-2">
                S
              </div>
              <h2 className="text-2xl font-bold font-cinzel tracking-wider text-stone-900 dark:text-white">
                SIERRA ESTATES · PRIVATE CLIENT ADVISORY
              </h2>
              <div className="text-xs font-cairo text-stone-600 dark:text-stone-400">
                مدينة القاهرة الجديدة والتوسعات الشرقية — المجلد المعماري المعتمد
              </div>
            </div>

            <div className="text-right font-mono text-xs text-stone-500 space-y-1">
              <div>REGISTRY VOL. 2026-Q1</div>
              <div>AUC HUB: 30.0197° N, 31.4988° E</div>
              <div className="text-amber-700 dark:text-amber-400 font-bold">CERTIFIED BILINGUAL EDITION</div>
            </div>
          </div>

          {/* Cartographic Artwork Framing */}
          <div className="relative rounded-xl overflow-hidden border border-amber-500/40">
            <img 
              src="/assets/aistudio/Image_1_f1dc350b.jpeg" 
              alt="Master Registry" 
              className="w-full h-auto object-cover max-h-[340px]"
            />
            <div className="p-3 bg-stone-900/90 text-stone-200 text-xs font-mono flex items-center justify-between">
              <span>FIGURE 1.0 — CARTOGRAPHIC SURVEY & RADIAL RADAR PLOT</span>
              <span>SCALE: 1:35,000 METRIC</span>
            </div>
          </div>

          {/* Key Executive Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70">
              <span className="text-[10px] font-mono text-stone-400 uppercase block">{isAr ? 'المشروعات المسجلة' : 'Mapped Enclaves'}</span>
              <span className="text-xl font-bold font-mono text-stone-900 dark:text-white mt-1 block">
                {REGISTRY_STATS.totalCompoundsMapped} Master Enclaves
              </span>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70">
              <span className="text-[10px] font-mono text-stone-400 uppercase block">{isAr ? 'تغطية المربع الذهبي' : 'Golden Square'}</span>
              <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1 block">
                100% Comprehensive
              </span>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70">
              <span className="text-[10px] font-mono text-stone-400 uppercase block">{isAr ? 'متوسط سعر الفيلا' : 'Median Villa Asset'}</span>
              <span className="text-xl font-bold font-mono text-stone-900 dark:text-white mt-1 block">
                EGP 24.5M
              </span>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70">
              <span className="text-[10px] font-mono text-stone-400 uppercase block">{isAr ? 'مركز الارتكاز' : 'Radial Epicenter'}</span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                AUC Campus
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
            <h4 className="text-sm font-bold font-cinzel uppercase text-stone-900 dark:text-white tracking-wider">
              {isAr ? 'الملخص الاستراتيجي للاستثمار العقاري بشرق القاهرة' : 'Strategic Eastern Cairo Real Estate Thesis'}
            </h4>
            <p>
              New Cairo City and its Eastern Expansions (including Golden Square, Mostakbal City, and the Suez Road corridor) represent the premier luxury capital preservation zone in Egypt. Anchored around the American University in Cairo (AUC) and framed by the Cairo Ring Road, Middle Ring Road, Suez Road, and Ain Sokhna Expressway, these master developments enjoy direct seamless connectivity to both Cairo International Airport and the New Administrative Capital.
            </p>
            <p>
              Sierra Estates curates verified allocations across institutional-grade developments including SODIC Villette, Mivida (Emaar Misr), Palm Hills New Cairo, Katameya Heights, Swan Lake Residences, and Sierra Residences.
            </p>
          </div>

          {/* Golden Square Spotlight Table */}
          <div>
            <h4 className="text-xs font-bold font-cinzel uppercase text-amber-700 dark:text-amber-400 tracking-wider mb-2">
              Featured Verified Allocations (As Recorded in Map Index)
            </h4>
            <div className="rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-100 dark:bg-stone-850 font-mono text-[10px] text-stone-500">
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Compound</th>
                    <th className="p-2.5">Typology</th>
                    <th className="p-2.5">BUA</th>
                    <th className="p-2.5">Land</th>
                    <th className="p-2.5 text-right">Price (EGP / USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                  {UNIT_LISTINGS.slice(0, 6).map(u => (
                    <tr key={u.id} className="text-[11px]">
                      <td className="p-2.5 font-bold text-amber-700">{u.unitCode}</td>
                      <td className="p-2.5 font-sans font-medium">{u.compoundNameEn}</td>
                      <td className="p-2.5">{u.typeEn}</td>
                      <td className="p-2.5">{u.buaM2} m²</td>
                      <td className="p-2.5">{u.landM2} m²</td>
                      <td className="p-2.5 text-right font-bold">
                        EGP {(u.resalePriceEgp / 1000000).toFixed(1)}M (${(u.resalePriceUsd / 1000).toFixed(0)}k)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stamped Certification Seal */}
          <div className="pt-6 border-t border-amber-600/30 flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-600 flex items-center justify-center text-amber-700 font-cinzel text-xs font-bold rotate-12">
                VERIFIED
              </div>
              <div>
                <div className="font-bold text-stone-800 dark:text-stone-200">SIERRA ESTATES REGISTRY SEAL</div>
                <div className="font-mono text-[10px]">Reference: SE-NC-2026-MASTER</div>
              </div>
            </div>

            <div className="font-mono text-[11px] text-right">
              <div>Survey Completed: 2026-Q1</div>
              <div>Prepared for: Institutional & Private Investors</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
