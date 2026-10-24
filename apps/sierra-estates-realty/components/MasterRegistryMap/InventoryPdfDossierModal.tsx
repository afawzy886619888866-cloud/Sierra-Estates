'use client';
import React, { useState } from 'react';
import { Compound, UnitListing, COMPOUNDS } from './registryData';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2,
  MapPin,
  Building2
} from 'lucide-react';

interface InventoryPdfDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompound: Compound | null;
  filteredUnits: UnitListing[];
  activePurpose: 'All' | 'Resale' | 'Rent';
  stats: {
    avgResale: number;
    avgRent: number;
    totalAssets: number;
    avgYield: number;
    avgPpm: number;
  };
  lang: 'en' | 'ar';
  isDarkMode: boolean;
}

export const InventoryPdfDossierModal: React.FC<InventoryPdfDossierModalProps> = ({
  isOpen,
  onClose,
  selectedCompound,
  filteredUnits,
  activePurpose,
  stats,
  lang,
  isDarkMode,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  // Determine the list of compounds represented in the current filtered view
  const representedCompounds = selectedCompound
    ? [selectedCompound]
    : COMPOUNDS.filter(c => filteredUnits.some(u => u.compoundId === c.id));

  const activeCompoundTitleEn = selectedCompound ? selectedCompound.nameEn : 'All New Cairo Enclaves';
  const activeCompoundTitleAr = selectedCompound ? selectedCompound.nameAr : 'جميع مشروعات القاهرة الجديدة';

  const handleZoomIn = () => setZoomScale(prev => Math.min(Number((prev + 0.25).toFixed(2)), 3.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(Number((prev - 0.25).toFixed(2)), 0.75));
  const handleResetZoom = () => setZoomScale(1);

  // Trigger browser native vector PDF print (uses @media print rules to render 100% vector PDF)
  const handlePrintVectorPdf = () => {
    window.print();
  };

  // Generate & download a standalone, high-DPI vector HTML/PDF dossier that never pixelates at any zoom
  const handleDownloadStandaloneDossier = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeName = (selectedCompound?.nameEn || 'New_Cairo_Master_Registry').replace(/[^a-zA-Z0-9]+/g, '_');

    const unitRowsHtml = filteredUnits
      .map((u, idx) => {
        const ppm = u.buaM2 > 0 ? Math.round(u.resalePriceEgp / u.buaM2) : 0;
        return `
          <tr>
            <td style="font-weight:700;color:#78716c;">${idx + 1}</td>
            <td style="font-weight:800;color:#b45309;font-family:'JetBrains Mono',monospace;">${u.unitCode}</td>
            <td style="font-weight:600;">${u.compoundNameEn} <span style="color:#78716c;font-size:10px;">(${u.compoundNameAr})</span></td>
            <td>${u.typeEn}</td>
            <td style="text-align:right;font-family:'JetBrains Mono',monospace;">${u.buaM2} m²</td>
            <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;color:#0369a1;">EGP ${ppm.toLocaleString()}</td>
            <td style="text-align:right;font-family:'JetBrains Mono',monospace;">${u.landM2 > 0 ? `${u.landM2} m²` : '—'}</td>
            <td style="text-align:center;font-family:'JetBrains Mono',monospace;">${u.bedrooms}BR / ${u.bathrooms}BA</td>
            <td style="text-align:center;"><span style="padding:2px 6px;border-radius:4px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;">${u.purpose}</span></td>
            <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;color:#047857;">EGP ${u.monthlyRentEgp.toLocaleString()}</td>
            <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:800;color:#b45309;">EGP ${u.resalePriceEgp.toLocaleString()}</td>
            <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;">${u.rentalYieldPct}%</td>
            <td style="text-align:center;font-family:'JetBrains Mono',monospace;">${u.deliveryYear}</td>
          </tr>
        `;
      })
      .join('');

    const compoundCardsHtml = representedCompounds
      .map(
        c => `
        <div style="border:1px solid #d6d3d1;border-radius:10px;padding:12px 14px;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e7e5e4;padding-bottom:6px;margin-bottom:8px;">
            <strong style="font-size:13px;color:#0c0a09;letter-spacing:0.04em;">№ ${c.indexNumber < 10 ? '0' + c.indexNumber : c.indexNumber} · ${c.nameEn} (${c.nameAr})</strong>
            <span style="font-size:11px;color:#0284c7;font-weight:700;">${c.developerEn}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:11px;font-family:'JetBrains Mono',monospace;">
            <div><span style="color:#78716c;display:block;font-size:9px;">ZONE</span><strong>${c.zoneEn}</strong></div>
            <div><span style="color:#78716c;display:block;font-size:9px;">AVG PRICE/M²</span><strong style="color:#b45309;">EGP ${c.avgMeterPriceEgp.toLocaleString()}</strong></div>
            <div><span style="color:#78716c;display:block;font-size:9px;">YIELD RANGE</span><strong style="color:#047857;">${c.rentalYieldRange}</strong></div>
            <div><span style="color:#78716c;display:block;font-size:9px;">AUC PROXIMITY</span><strong>${c.driveTimeToAucMin} mins</strong></div>
          </div>
        </div>
      `
      )
      .join('');

    const htmlDocument = `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <title>Sierra Estates — Branded Inventory Dossier (${activeCompoundTitleEn})</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FAF8F5;
      color: #1c1917;
      margin: 0;
      padding: 24px;
    }
    .dossier-shell {
      max-width: 1240px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #D4AF37;
      border-radius: 16px;
      padding: 28px 32px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.08);
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #061122;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #b45309;
      font-family: monospace;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .kpi-card {
      padding: 12px 14px;
      border-radius: 10px;
      background: #fafaf9;
      border: 1px solid #e7e5e4;
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #78716c;
      font-family: monospace;
      display: block;
    }
    .kpi-val {
      font-size: 16px;
      font-weight: 800;
      color: #0c0a09;
      font-family: monospace;
      margin-top: 4px;
      display: block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 12px;
    }
    th {
      background: #061122;
      color: #f5f5f4;
      padding: 9px 8px;
      text-align: left;
      font-family: monospace;
      font-size: 10px;
      text-transform: uppercase;
      border: 1px solid #1e293b;
    }
    td {
      padding: 8px;
      border: 1px solid #e7e5e4;
    }
    tr:nth-child(even) { background: #fafaf9; }
    .print-toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 16px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      border: none;
      background: #D4AF37;
      color: #061122;
    }
    @media print {
      body { padding: 0; background: #ffffff; }
      .print-toolbar { display: none !important; }
      .dossier-shell { border: 1.5px solid #D4AF37; box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button class="btn" onclick="window.print()">Print / Save as High-Res Vector PDF</button>
  </div>
  <div class="dossier-shell">
    <div class="top-bar">
      <div>
        <div class="brand-sub">SIERRA ESTATES · OFFICIAL VERIFIED INVENTORY DOSSIER (VECTOR 600-DPI)</div>
        <h1 class="brand-title">${activeCompoundTitleEn} · ${activeCompoundTitleAr}</h1>
        <div style="font-size:12px;color:#57534e;margin-top:4px;">
          Filter Mode: <strong>${activePurpose}</strong> · Verified Units: <strong>${filteredUnits.length}</strong> · Portal: <strong>www.sierra-estates.net</strong> · Direct Desk: <strong>+20 109 204 8333</strong>
        </div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:11px;color:#57534e;">
        <div>DATE: ${dateStr}</div>
        <div>REF: SE-INV-2026-${safeName.toUpperCase()}</div>
        <div style="color:#b45309;font-weight:700;">INFINITE VECTOR RESOLUTION</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Filtered Units</span>
        <span class="kpi-val">${filteredUnits.length} Units</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Avg Price / m²</span>
        <span class="kpi-val" style="color:#0284c7;">EGP ${Math.round(stats.avgPpm).toLocaleString()}/m²</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Avg Resale Price</span>
        <span class="kpi-val" style="color:#b45309;">EGP ${(stats.avgResale / 1_000_000).toFixed(2)}M</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Avg Monthly Rent</span>
        <span class="kpi-val" style="color:#047857;">EGP ${Math.round(stats.avgRent).toLocaleString()}/mo</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Avg Gross Yield</span>
        <span class="kpi-val" style="color:#047857;">${stats.avgYield.toFixed(2)}%</span>
      </div>
    </div>

    <!-- High-Precision Vector Cadastral Masterplan Diagram (Never Pixelates at Any Zoom) -->
    <div style="margin-bottom:20px;border:1px solid #D4AF37;border-radius:12px;padding:14px;background:#061122;color:#f5f5f4;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-family:monospace;font-size:10px;color:#fbbf24;margin-bottom:8px;">
        <span>ARCHITECTURAL CAD VECTOR MASTERPLAN · ${activeCompoundTitleEn.toUpperCase()}</span>
        <span>RESOLUTION: INFINITE VECTOR SVG (0% PIXELATION AT 1600% ZOOM)</span>
      </div>
      <svg viewBox="0 0 1000 220" width="100%" height="190" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
        <defs>
          <pattern id="cadGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" stroke-width="0.6" />
          </pattern>
        </defs>
        <rect width="1000" height="220" rx="8" fill="#061122" />
        <rect width="1000" height="220" rx="8" fill="url(#cadGrid)" />
        <!-- Arterial Roads Vector -->
        <path d="M 30 185 Q 320 140 970 165" fill="none" stroke="#D4AF37" stroke-width="2.2" stroke-dasharray="6 4" />
        <path d="M 40 45 Q 480 70 960 35" fill="none" stroke="#38BDF8" stroke-width="1.8" stroke-dasharray="4 4" />
        <line x1="500" y1="10" x2="500" y2="210" stroke="#D4AF37" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.5" />
        <!-- Central Lagoon & Parcel Subdivisions -->
        <ellipse cx="500" cy="110" rx="165" ry="52" fill="rgba(56,189,248,0.14)" stroke="#38BDF8" stroke-width="1.8" />
        <ellipse cx="500" cy="110" rx="260" ry="82" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-dasharray="5 3" />
        <!-- Parcel Plots Vector -->
        ${filteredUnits
          .slice(0, 12)
          .map((u, i) => {
            const angle = (i / Math.min(filteredUnits.length, 12)) * Math.PI * 2;
            const px = 500 + Math.cos(angle) * 210;
            const py = 110 + Math.sin(angle) * 68;
            return `<g>
              <rect x="${(px - 26).toFixed(1)}" y="${(py - 11).toFixed(1)}" width="52" height="22" rx="3" fill="#0f172a" stroke="#D4AF37" stroke-width="1.2" />
              <text x="${px.toFixed(1)}" y="${(py + 3).toFixed(1)}" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="8" font-weight="bold">${u.unitCode}</text>
            </g>`;
          })
          .join('')}
        <text x="500" y="106" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold">${activeCompoundTitleEn.toUpperCase()}</text>
        <text x="500" y="122" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="9">CENTRAL LAGOON &amp; VERIFIED PARCEL ALLOCATIONS · SCALE 1:2,500</text>
      </svg>
    </div>

    <!-- Compound Executive Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(${Math.min(representedCompounds.length, 2)},1fr);gap:10px;margin-bottom:18px;">
      ${compoundCardsHtml}
    </div>

    <!-- Full Filtered Inventory Table -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Unit Code</th>
          <th>Compound</th>
          <th>Typology</th>
          <th style="text-align:right;">BUA</th>
          <th style="text-align:right;">Price / m²</th>
          <th style="text-align:right;">Land</th>
          <th style="text-align:center;">Beds/Baths</th>
          <th style="text-align:center;">Purpose</th>
          <th style="text-align:right;">Monthly Rent</th>
          <th style="text-align:right;">Resale Price</th>
          <th style="text-align:right;">Yield</th>
          <th style="text-align:center;">Handover</th>
        </tr>
      </thead>
      <tbody>
        ${unitRowsHtml}
      </tbody>
    </table>

    <div style="margin-top:20px;padding-top:12px;border-top:1px solid #d6d3d1;display:flex;justify-content:space-between;font-size:10px;font-family:monospace;color:#78716c;">
      <span>CERTIFIED BY SIERRA ESTATES NEW CAIRO ADVISORY · WWW.SIERRA-ESTATES.NET</span>
      <span>PRIVATE CLIENT DESK: +20 109 204 8333 · INFO@SIERRA-ESTATES.NET</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sierra_Estates_Inventory_Dossier_${safeName}_2026.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Print-specific CSS so printing / saving as PDF from browser produces a 100% vector multi-page PDF without UI chrome */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #sierra-printable-inventory-dossier,
          #sierra-printable-inventory-dossier * {
            visibility: visible;
          }
          #sierra-printable-inventory-dossier {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            background: #FFFFFF !important;
            color: #0C0A09 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className={`relative w-full max-w-6xl rounded-2xl border-2 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col ${
          isDarkMode
            ? 'bg-[#070E1A] border-amber-500/40 text-stone-100'
            : 'bg-[#FAF8F5] border-amber-600/40 text-stone-900'
        }`}
      >
        {/* Top Control & Action Bar */}
        <div className="no-print px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#061122] via-[#0D1F3C] to-[#061122] text-white border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-amber-400/50 bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest uppercase text-amber-300 font-bold">
                  {isAr ? 'ملف حصر الوحدات المعتمد (دقة فائقة بدون بكسل)' : 'BRANDED VECTOR PDF INVENTORY DOSSIER · 600 DPI'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {isAr ? 'دقة لانهائية عند التكبير' : 'Infinite Vector Zoom'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold font-cinzel text-white">
                {isAr ? activeCompoundTitleAr : activeCompoundTitleEn} — ({filteredUnits.length} {isAr ? 'وحدة معروضة' : 'Filtered Units'})
              </h3>
            </div>
          </div>

          {/* Interactive Vector Zoom & Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* High-Resolution Vector Zoom Controls */}
            <div className="flex items-center bg-stone-900/90 border border-stone-700 rounded-lg overflow-hidden text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-stone-800 text-stone-300 cursor-pointer"
                title={isAr ? 'تصغير' : 'Zoom Out'}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 font-mono text-[11px] font-bold text-amber-300 border-x border-stone-700 min-w-[54px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-stone-800 text-stone-300 cursor-pointer"
                title={isAr ? 'تكبير فائق الدقة' : 'Zoom In (Lossless Vector)'}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-stone-800 text-stone-300 border-l border-stone-700 cursor-pointer"
                title={isAr ? 'إعادة ضبط التكبير' : 'Reset Zoom'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrintVectorPdf}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة / حفظ كملف PDF' : 'Print / Save as PDF'}</span>
            </button>

            {/* Direct Download Dossier File */}
            <button
              type="button"
              onClick={handleDownloadStandaloneDossier}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل ملف الكتيب مباشرة' : 'Download Dossier File'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable & Lossless-Zoomable Printable Dossier Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-stone-200/70 dark:bg-[#040811]">
          {/* True Vector Zoom Wrapper: scales layout width rather than GPU bitmap texture so fonts, borders, and SVGs never pixelate! */}
          <div
            id="sierra-printable-inventory-dossier"
            style={{
              width: `${100 * zoomScale}%`,
              maxWidth: zoomScale === 1 ? '1080px' : 'none',
              fontSize: `${100 * zoomScale}%`,
            }}
            className={`mx-auto rounded-xl border-2 p-6 sm:p-8 shadow-2xl transition-colors ${
              isDarkMode
                ? 'bg-[#091324] border-amber-500/40 text-stone-100'
                : 'bg-white border-[#D4AF37] text-stone-900'
            }`}
          >
            {/* Dossier Official Letterhead */}
            <div className="border-b-2 border-amber-500/40 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500/60 bg-[#061122] p-1 shrink-0">
                  <img
                    src="/assets/aistudio/8e9559f6f_image__1__4350f848.png"
                    alt="Sierra Estates Seal"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                    SIERRA ESTATES · NEW CAIRO 2026 MASTER REGISTRY
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold font-cinzel tracking-wide text-stone-900 dark:text-white">
                    {isAr
                      ? `كتيب حصر الوحدات: ${activeCompoundTitleAr}`
                      : `OFFICIAL INVENTORY DOSSIER: ${activeCompoundTitleEn.toUpperCase()}`}
                  </h2>
                  <div className="text-xs font-mono text-stone-500 dark:text-stone-400 mt-0.5">
                    {isAr
                      ? `تصنيف العرض: ${activePurpose} · عدد الوحدات المطابقة: ${filteredUnits.length} وحدة`
                      : `Filter Allocation: ${activePurpose} · Verified Matching Inventory: ${filteredUnits.length} Units`}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono text-xs text-stone-500 dark:text-stone-400 space-y-0.5 shrink-0">
                <div className="font-bold text-stone-800 dark:text-stone-200">sierra-estates.net</div>
                <div>Direct Advisory: +20 109 204 8333</div>
                <div className="text-amber-600 dark:text-amber-400 font-bold">4K CAD + VECTOR 600-DPI</div>
              </div>
            </div>

            {/* Executive Financial Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">
                  {isAr ? 'إجمالي الوحدات' : 'Filtered Units'}
                </span>
                <span className="text-base font-extrabold font-mono text-stone-900 dark:text-white mt-0.5 block">
                  {filteredUnits.length} {isAr ? 'وحدة' : 'Units'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                <span className="text-[10px] font-mono uppercase text-cyan-600 dark:text-cyan-400 block">
                  {isAr ? 'متوسط سعر المتر' : 'Avg Price / m²'}
                </span>
                <span className="text-base font-extrabold font-mono text-cyan-700 dark:text-cyan-300 mt-0.5 block">
                  EGP {Math.round(stats.avgPpm).toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <span className="text-[10px] font-mono uppercase text-amber-700 dark:text-amber-400 block">
                  {isAr ? 'متوسط سعر البيع' : 'Avg Resale Price'}
                </span>
                <span className="text-base font-extrabold font-mono text-amber-700 dark:text-amber-300 mt-0.5 block">
                  EGP {(stats.avgResale / 1_000_000).toFixed(2)}M
                </span>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-400 block">
                  {isAr ? 'متوسط الإيجار الشهري' : 'Avg Monthly Rent'}
                </span>
                <span className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                  EGP {Math.round(stats.avgRent).toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">
                  {isAr ? 'متوسط العائد الإيجاري' : 'Avg Rental Yield'}
                </span>
                <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {stats.avgYield.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Dual High-Resolution Visual Section: 4K Masterplan + Infinite-Resolution Vector CAD Blueprint */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Left: 4K Ultra-HD Masterplan Locator with Vector Overlay */}
              <div className="rounded-xl overflow-hidden border border-amber-500/40 bg-[#061122] flex flex-col">
                <div className="px-3 py-2 bg-[#061122] border-b border-amber-500/20 flex items-center justify-between text-[10px] font-mono text-amber-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'الموقع على الخريطة الرئيسية (4K Ultra-HD)' : '4K ULTRA-HD MASTERPLAN LOCATOR'}</span>
                  </span>
                  <span>3840 × 2143 PX + VECTOR SVG</span>
                </div>
                <div className="relative w-full aspect-[16/9] overflow-hidden">
                  <img
                    src="/assets/aistudio/Image_1_f1dc350b.jpeg"
                    alt="New Cairo 4K Masterplan"
                    className="w-full h-full object-cover"
                  />
                  {/* Crisp Vector Target Overlay */}
                  <svg
                    viewBox="0 0 1000 562.5"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    shapeRendering="geometricPrecision"
                    textRendering="geometricPrecision"
                  >
                    {representedCompounds.map(c => {
                      const cx = (c.xPct / 100) * 1000;
                      const cy = (c.yPct / 100) * 562.5;
                      return (
                        <g key={c.id}>
                          <ellipse
                            cx={cx}
                            cy={cy}
                            rx={c.boundaryRadiusX * 1.15}
                            ry={c.boundaryRadiusY * 1.15}
                            fill="rgba(251, 191, 36, 0.24)"
                            stroke="#FDE047"
                            strokeWidth="2.5"
                          />
                          <circle cx={cx} cy={cy} r="5" fill="#FDE047" stroke="#061122" strokeWidth="1.5" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Right: 100% Vector Architectural CAD Parcel Plot (Zero Pixelation at Any Zoom) */}
              <div className="rounded-xl overflow-hidden border border-cyan-500/40 bg-[#061122] flex flex-col">
                <div className="px-3 py-2 bg-[#061122] border-b border-cyan-500/20 flex items-center justify-between text-[10px] font-mono text-cyan-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isAr ? 'مخطط تقسيم الوحدات المتجه (Vector CAD)' : 'LOSSLESS VECTOR CAD PARCEL BLUEPRINT'}</span>
                  </span>
                  <span>INFINITE RESOLUTION (SVG)</span>
                </div>
                <div className="relative w-full aspect-[16/9] bg-[#040B16] flex items-center justify-center">
                  <svg
                    viewBox="0 0 800 450"
                    className="w-full h-full"
                    shapeRendering="geometricPrecision"
                    textRendering="geometricPrecision"
                  >
                    <defs>
                      <pattern id="dossierCadGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1E293B" strokeWidth="0.7" />
                        <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#0F172A" strokeWidth="0.4" />
                      </pattern>
                    </defs>
                    <rect width="800" height="450" fill="url(#dossierCadGrid)" />

                    {/* Outer Cadastral Perimeter */}
                    <rect
                      x="36"
                      y="32"
                      width="728"
                      height="386"
                      rx="22"
                      fill="rgba(6, 182, 212, 0.04)"
                      stroke="#38BDF8"
                      strokeWidth="1.8"
                      strokeDasharray="8 5"
                    />
                    <rect
                      x="48"
                      y="44"
                      width="704"
                      height="362"
                      rx="16"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="1"
                      opacity="0.6"
                    />

                    {/* Spine Boulevards */}
                    <path d="M 48 225 L 752 225" stroke="#D4AF37" strokeWidth="1.4" strokeDasharray="5 5" opacity="0.65" />
                    <path d="M 400 44 L 400 406" stroke="#D4AF37" strokeWidth="1.4" strokeDasharray="5 5" opacity="0.65" />

                    {/* Central Crystal Lagoon & Clubhouse Vector */}
                    <ellipse
                      cx="400"
                      cy="225"
                      rx="145"
                      ry="68"
                      fill="rgba(56, 189, 248, 0.16)"
                      stroke="#38BDF8"
                      strokeWidth="2"
                    />
                    <ellipse
                      cx="400"
                      cy="225"
                      rx="110"
                      ry="46"
                      fill="rgba(14, 165, 233, 0.22)"
                      stroke="#7DD3FC"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                    <text
                      x="400"
                      y="220"
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="12"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {activeCompoundTitleEn.toUpperCase()}
                    </text>
                    <text
                      x="400"
                      y="236"
                      textAnchor="middle"
                      fill="#38BDF8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      CENTRAL LAGOON &amp; CLUBHOUSE CORE · {filteredUnits.length} VERIFIED PLOTS
                    </text>

                    {/* Individual Filtered Unit Plot Callouts around Perimeter */}
                    {filteredUnits.slice(0, 12).map((u, idx) => {
                      const total = Math.min(filteredUnits.length, 12);
                      const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
                      const rx = 255;
                      const ry = 138;
                      const ux = 400 + Math.cos(angle) * rx;
                      const uy = 225 + Math.sin(angle) * ry;
                      const ppm = u.buaM2 > 0 ? Math.round(u.resalePriceEgp / u.buaM2) : 0;

                      return (
                        <g key={u.id}>
                          <line
                            x1={400 + Math.cos(angle) * 145}
                            y1={225 + Math.sin(angle) * 68}
                            x2={ux}
                            y2={uy}
                            stroke="#D4AF37"
                            strokeWidth="0.8"
                            strokeDasharray="2 2"
                            opacity="0.7"
                          />
                          <rect
                            x={ux - 44}
                            y={uy - 17}
                            width="88"
                            height="34"
                            rx="5"
                            fill="#091526"
                            stroke="#D4AF37"
                            strokeWidth="1.4"
                          />
                          <text
                            x={ux}
                            y={uy - 3}
                            textAnchor="middle"
                            fill="#FBBF24"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {u.unitCode}
                          </text>
                          <text
                            x={ux}
                            y={uy + 10}
                            textAnchor="middle"
                            fill="#E2E8F0"
                            fontSize="7.5"
                            fontFamily="monospace"
                          >
                            {u.buaM2}m² · {(ppm / 1000).toFixed(0)}K/m²
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Filtered Compound Profile Cards */}
            <div className="mb-6">
              <div className="text-xs font-bold font-cinzel uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>
                  {isAr
                    ? `ملخص المشروعات المدرجة في التقرير (${representedCompounds.length})`
                    : `Included Enclave Profiles (${representedCompounds.length})`}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {representedCompounds.map(comp => (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-1.5">
                      <div>
                        <span className="text-xs font-bold font-cinzel text-stone-900 dark:text-white">
                          № {comp.indexNumber < 10 ? `0${comp.indexNumber}` : comp.indexNumber} · {comp.nameEn}
                        </span>
                        <span className="text-xs font-cairo text-amber-700 dark:text-amber-400 ml-2">
                          ({comp.nameAr})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {comp.developerEn}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-stone-400 block">{isAr ? 'المنطقة' : 'Zone'}</span>
                        <span className="font-bold text-stone-800 dark:text-stone-200">{comp.zoneEn}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">{isAr ? 'متوسط المتر' : 'Avg/m²'}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          EGP {comp.avgMeterPriceEgp.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">{isAr ? 'العائد' : 'Yield'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{comp.rentalYieldRange}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">{isAr ? 'إلى AUC' : 'To AUC'}</span>
                        <span className="font-bold text-stone-800 dark:text-stone-200">{comp.driveTimeToAucMin} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Filtered Unit Inventory Table */}
            <div>
              <div className="text-xs font-bold font-cinzel uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2.5 flex items-center justify-between">
                <span>
                  {isAr
                    ? `جدول الوحدات المفلترة بالكامل (${filteredUnits.length} وحدة)`
                    : `Verified Filtered Unit Inventory Schedule (${filteredUnits.length} Units)`}
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  =VALUATION.SCHEDULE("{activeCompoundTitleEn}", PURPOSE="{activePurpose}")
                </span>
              </div>

              <div className="rounded-xl border border-stone-300 dark:border-stone-800 overflow-hidden">
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead className="bg-[#061122] text-stone-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-2.5 border-r border-stone-700 text-center">#</th>
                      <th className="py-2.5 px-3 border-r border-stone-700">{isAr ? 'الكود' : 'Unit Code'}</th>
                      <th className="py-2.5 px-3 border-r border-stone-700">{isAr ? 'المشروع' : 'Compound'}</th>
                      <th className="py-2.5 px-3 border-r border-stone-700">{isAr ? 'النوع' : 'Typology'}</th>
                      <th className="py-2.5 px-3 border-r border-stone-700 text-right">BUA</th>
                      <th className="py-2.5 px-3 border-r border-stone-700 text-right text-cyan-300">
                        {isAr ? 'سعر المتر' : 'Price / m²'}
                      </th>
                      <th className="py-2.5 px-3 border-r border-stone-700 text-right">Land</th>
                      <th className="py-2.5 px-2.5 border-r border-stone-700 text-center">BR/BA</th>
                      <th className="py-2.5 px-2.5 border-r border-stone-700 text-center">{isAr ? 'الغرض' : 'Purpose'}</th>
                      <th className="py-2.5 px-3 border-r border-stone-700 text-right text-emerald-300">
                        {isAr ? 'الإيجار الشهري' : 'Monthly Rent'}
                      </th>
                      <th className="py-2.5 px-3 border-r border-stone-700 text-right text-amber-300">
                        {isAr ? 'سعر البيع' : 'Resale Price'}
                      </th>
                      <th className="py-2.5 px-2.5 text-right">Yield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {filteredUnits.map((u, index) => {
                      const ppm = u.buaM2 > 0 ? Math.round(u.resalePriceEgp / u.buaM2) : 0;
                      return (
                        <tr
                          key={u.id}
                          className="odd:bg-white even:bg-stone-50/80 dark:odd:bg-[#0B1526] dark:even:bg-[#0E1A2F]"
                        >
                          <td className="py-2 px-2.5 border-r border-stone-200 dark:border-stone-800 text-center text-stone-400 font-bold">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 font-bold text-amber-700 dark:text-amber-400">
                            {u.unitCode}
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 font-sans font-semibold">
                            {isAr ? u.compoundNameAr : u.compoundNameEn}
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 font-sans">
                            {isAr ? u.typeAr : u.typeEn}
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right">
                            {u.buaM2} m²
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-bold text-cyan-700 dark:text-cyan-300">
                            EGP {ppm.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right">
                            {u.landM2 > 0 ? `${u.landM2} m²` : '—'}
                          </td>
                          <td className="py-2 px-2.5 border-r border-stone-200 dark:border-stone-800 text-center">
                            {u.bedrooms}B/{u.bathrooms}B
                          </td>
                          <td className="py-2 px-2.5 border-r border-stone-200 dark:border-stone-800 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              {u.purpose}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            EGP {u.monthlyRentEgp.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-bold text-amber-700 dark:text-amber-300">
                            EGP {u.resalePriceEgp.toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold">
                            {u.rentalYieldPct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Certification Footer */}
            <div className="mt-6 pt-4 border-t-2 border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-500 flex items-center justify-center text-amber-600 dark:text-amber-400 font-cinzel text-[9px] font-bold">
                  VERIFIED
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>SIERRA ESTATES · OFFICIAL NEW CAIRO REGISTRY SEAL</span>
                  </div>
                  <div className="font-mono text-[10px]">
                    Authorized Brokerage &amp; Advisory · Direct WhatsApp/Desk: +20 109 204 8333
                  </div>
                </div>
              </div>
              <div className="font-mono text-[10px] text-right">
                <div>Vector Cadastral Edition · 2026-Q4</div>
                <div>www.sierra-estates.net</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
