"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Download,
  Camera,
  Copy,
  Check,
  MessageCircle,
  RotateCcw,
  Send,
} from "lucide-react";
import type { InventoryUnit } from "@/lib/inventory/types";

// STRICT SIERRA ESTATES PROTOCOL CONTACT NUMBER (ZERO TOLERANCE FOR ANY OTHER NUMBER)
export const SIERRA_CONTACT_PHONE = "01092048333";
export const SIERRA_WHATSAPP_PHONE = "201092048333";

export interface ExcelInventorySheetProps {
  compoundName?: string | null;
  initialUnits?: InventoryUnit[];
  isAr?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function ExcelInventorySheet({
  compoundName,
  initialUnits = [],
  isAr = false,
  onClose,
  isEmbedded = false,
}: ExcelInventorySheetProps) {
  const [units, setUnits] = useState<InventoryUnit[]>(initialUnits);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<"all" | "sale" | "rent">("all");
  const [bedsFilter, setBedsFilter] = useState<string>("all"); // 'all' | '1' | '2' | '3' | '4' | '5+'
  const [pricePreset, setPricePreset] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(100000000);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Photo / Viewing Request dialog state
  const [selectedUnitForPhotos, setSelectedUnitForPhotos] = useState<InventoryUnit | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+20 ");
  const [clientEmail, setClientEmail] = useState("");
  const [inquiryNotes, setInquiryNotes] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch or filter units when component mounts or compoundName changes
  useEffect(() => {
    if (initialUnits && initialUnits.length > 0) {
      if (compoundName) {
        const cleanTarget = compoundName.toLowerCase().trim();
        const matched = initialUnits.filter((u) => {
          const cmp = (u.compound || u.location || "").toLowerCase().trim();
          return cmp.includes(cleanTarget) || cleanTarget.includes(cmp);
        });
        setUnits(matched.length > 0 ? matched : initialUnits);
      } else {
        setUnits(initialUnits);
      }
      return;
    }

    setLoading(true);
    const url = compoundName
      ? `/api/inventory?compound=${encodeURIComponent(compoundName)}`
      : `/api/inventory?limit=500`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setLoading(false);
        if (data && Array.isArray(data.units)) {
          setUnits(data.units);
        }
      })
      .catch((err) => {
        console.warn("[ExcelInventorySheet] Error fetching inventory:", err);
        setLoading(false);
      });
  }, [compoundName, initialUnits]);

  // Price presets
  const salePresets = useMemo(
    () => [
      { id: "all", labelEn: "All Prices", labelAr: "كل الأسعار", min: 0, max: 100000000 },
      { id: "under15", labelEn: "< 15M EGP", labelAr: "أقل من 15م", min: 0, max: 15000000 },
      { id: "15to30", labelEn: "15M - 30M", labelAr: "15م - 30م", min: 15000000, max: 30000000 },
      { id: "30to50", labelEn: "30M - 50M", labelAr: "30م - 50م", min: 30000000, max: 50000000 },
      { id: "over50", labelEn: "> 50M EGP", labelAr: "أكثر من 50م", min: 50000000, max: 200000000 },
    ],
    []
  );

  const rentPresets = useMemo(
    () => [
      { id: "all", labelEn: "All Rent", labelAr: "كل الإيجارات", min: 0, max: 500000 },
      { id: "under40", labelEn: "< 40K /mo", labelAr: "أقل من 40 ألف", min: 0, max: 40000 },
      { id: "40to80", labelEn: "40K - 80K", labelAr: "40 - 80 ألف", min: 40000, max: 80000 },
      { id: "over80", labelEn: "> 80K /mo", labelAr: "أكثر من 80 ألف", min: 80000, max: 500000 },
    ],
    []
  );

  const activePresets = categoryFilter === "rent" ? rentPresets : salePresets;

  const handleSelectPreset = (p: { id: string; min: number; max: number }) => {
    setPricePreset(p.id);
    setMinPrice(p.min);
    setMaxPrice(p.max);
  };

  const handleResetFilters = () => {
    setCategoryFilter("all");
    setBedsFilter("all");
    setPricePreset("all");
    setMinPrice(0);
    setMaxPrice(100000000);
    setSearchQuery("");
  };

  // Real-time Filtering
  const filteredRows = useMemo(() => {
    return units.filter((u) => {
      // Category / Listing Type filter
      if (categoryFilter !== "all" && u.mode !== categoryFilter) {
        return false;
      }

      // Bedrooms filter
      if (bedsFilter !== "all") {
        const beds = u.beds ?? 0;
        if (bedsFilter === "5+") {
          if (beds < 5) return false;
        } else {
          if (beds !== Number(bedsFilter)) return false;
        }
      }

      // Price Range filter
      const price = u.price ?? 0;
      if (price > 0) {
        if (price < minPrice || price > maxPrice) return false;
      }

      // Free-text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (u.code || u.id || "").toLowerCase();
        const cmp = (u.compound || u.location || "").toLowerCase();
        const type = (u.propertyType || u.type || "").toLowerCase();
        const finishing = (u.finishingQuality || "").toLowerCase();
        const priceLabel = (u.priceLabel || String(u.price || "")).toLowerCase();
        const matches =
          code.includes(q) ||
          cmp.includes(q) ||
          type.includes(q) ||
          finishing.includes(q) ||
          priceLabel.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [units, categoryFilter, bedsFilter, minPrice, maxPrice, searchQuery]);

  // Copy code helper
  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  // Direct WhatsApp VIP for any unit
  const handleDirectWhatsApp = (unit: InventoryUnit) => {
    const code = unit.code || unit.id;
    const cmp = unit.compound || compoundName || "New Cairo";
    const price = unit.priceLabel || `${(unit.price || 0).toLocaleString()} EGP`;
    const type = unit.propertyType || unit.type || "Unit";
    const msg = isAr
      ? `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة كود (${code}) في ${cmp} (${type} - ${price}).`
      : `Hello Sierra Estates, I would like to inquire about Unit (${code}) in ${cmp} (${type} - ${price}).`;
    window.open(`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Export filtered rows to CSV
  const handleExportCsv = () => {
    if (!filteredRows.length) return;
    const headers = [
      "Sierra Code",
      "Compound",
      "Property Type",
      "Category",
      "Bedrooms",
      "Bathrooms",
      "Area (m2)",
      "Price (EGP)",
      "Finishing",
      "Advisory Desk Contact",
    ];

    const rows = filteredRows.map((u) => [
      `"${u.code || u.id}"`,
      `"${u.compound || compoundName || ""}"`,
      `"${u.propertyType || u.type || ""}"`,
      `"${u.mode === "rent" ? "Rent" : "Resale"}"`,
      `"${u.beds ?? ""}"`,
      `"${u.bath ?? ""}"`,
      `"${u.area ?? ""}"`,
      `"${u.price || ""}"`,
      `"${u.finishingQuality || ""}"`,
      `"${SIERRA_CONTACT_PHONE}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (compoundName || "New-Cairo-Master").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `Sierra_Estates_${safeName}_Inventory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Photo / Inspection Request
  const handleSendPhotoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitForPhotos) return;

    const cleanPhone = clientPhone.replace(/[^0-9+]/g, "");
    if (cleanPhone.length < 9) {
      setFormError(
        isAr ? "يرجى إدخال رقم هاتف صحيح مع كود الدولة" : "Please enter a valid phone number"
      );
      return;
    }

    setIsSubmittingLead(true);
    setFormError("");

    const code = selectedUnitForPhotos.code || selectedUnitForPhotos.id;
    const cmp = selectedUnitForPhotos.compound || compoundName || "New Cairo";
    const price = selectedUnitForPhotos.priceLabel || `${selectedUnitForPhotos.price} EGP`;

    try {
      const payload = {
        name: clientName,
        phone: cleanPhone,
        intent: selectedUnitForPhotos.mode === "rent" ? "rent" : "buy",
        type: selectedUnitForPhotos.propertyType || "Unit",
        zone: cmp,
        budget: String(selectedUnitForPhotos.price || 0),
        source: `excel_sheet_${cmp.replace(/\s+/g, "_")}`,
        message: `Photo Request for Unit ${code} in ${cmp}. Client Note: ${inquiryNotes || "None"}`,
      };

      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Direct WhatsApp link to Sierra Estates Desk (01092048333)
      const waText = isAr
        ? `مرحباً سييرا العقارية، قمت بطلب صور ومعاينة للوحدة كود (${code}) في ${cmp}.\nالسعر: ${price}\nالاسم: ${clientName}\nالهاتف: ${cleanPhone}\nالملاحظات: ${inquiryNotes || "طلب تصوير فوري"}`
        : `Hello Sierra Estates, I requested photos and inspection for Unit (${code}) in ${cmp}.\nPrice: ${price}\nName: ${clientName}\nPhone: ${cleanPhone}\nNote: ${inquiryNotes || "On-demand photos request"}`;

      window.open(`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(waText)}`, "_blank");
      setIsSubmittingLead(false);
      setLeadSuccess(true);
    } catch {
      setIsSubmittingLead(false);
      // Fallback direct WhatsApp
      const waText = `Hello Sierra Estates, photo request for Unit ${code} in ${cmp} (${price}). Name: ${clientName}`;
      window.open(`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(waText)}`, "_blank");
      setLeadSuccess(true);
    }
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      style={{ fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif" }}
      className={`relative w-full ${
        isEmbedded ? "h-[740px]" : "h-full min-h-[600px]"
      } flex flex-col rounded-2xl bg-[#061122] text-slate-100 border border-slate-800/90 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden select-none`}
    >
      {/* TOP COMMAND BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-[#07172c]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {compoundName
                  ? isAr
                    ? `شيت مخزون ${compoundName}`
                    : `${compoundName} · Master Inventory Sheet`
                  : isAr
                  ? "شيت مخزون القاهرة الجديدة الكامل"
                  : "New Cairo Master Inventory Sheet"}
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                {filteredRows.length} {isAr ? "وحدة مطابقة" : "Matching Units"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
              {isAr
                ? `بيانات حية مباشرة من المستودع المركزي. للتواصل المباشر: ${SIERRA_CONTACT_PHONE}`
                : `Live verified cadastral units synced with Supabase. Advisory Desk: ${SIERRA_CONTACT_PHONE}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Sidebar Button */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isSidebarOpen
                ? "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(234,179,8,0.25)]"
                : "bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isAr ? "الفلاتر الذكية" : "Filter Sidebar"}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isAr ? "تصدير Excel" : "Export CSV"}</span>
          </button>

          {/* Direct WhatsApp Desk Button */}
          <a
            href={`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(
              isAr
                ? `مرحباً سييرا العقارية، أود الاستفسار عن وحدات شيت المخزون ${compoundName || "القاهرة الجديدة"}.`
                : `Hello Sierra Estates, inquiring about units in the inventory sheet for ${compoundName || "New Cairo"}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30 transition shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{SIERRA_CONTACT_PHONE}</span>
          </a>

          {/* Close modal button if provided */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-900/90 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTAINER: SIDEBAR + DATA GRID */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LUXURY COLLAPSIBLE FILTERING SIDEBAR */}
        <div
          style={{
            background: "rgba(6, 17, 34, 0.96)",
            backdropFilter: "blur(20px)",
            width: isSidebarOpen ? "300px" : "0px",
          }}
          className={`shrink-0 border-e border-slate-800/90 transition-all duration-300 ease-in-out overflow-hidden flex flex-col z-20 shadow-2xl`}
        >
          <div className="w-[300px] h-full flex flex-col p-4 space-y-4 overflow-y-auto no-scrollbar">
            {/* Sidebar Header & Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5" />
                <span>{isAr ? "تخصيص البحث" : "Filter Criteria"}</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-400 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isAr ? "إعادة ضبط" : "Reset"}</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                {isAr ? "بحث فوري" : "Instant Search"}
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? "كود، كمبوند، تشطيب..." : "Code, type, finishing..."}
                  className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            {/* Filter 1: Unit Type / Listing Category (All, Resale, Rent) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                <span>{isAr ? "نوع المعاملة" : "Category"}</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {categoryFilter.toUpperCase()}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("all");
                    setPricePreset("all");
                  }}
                  className={`py-1.5 rounded-lg text-center transition ${
                    categoryFilter === "all"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isAr ? "الكل" : "All"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("sale");
                    setPricePreset("all");
                  }}
                  className={`py-1.5 rounded-lg text-center transition ${
                    categoryFilter === "sale"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isAr ? "إعادة بيع" : "Resale"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("rent");
                    setPricePreset("all");
                  }}
                  className={`py-1.5 rounded-lg text-center transition ${
                    categoryFilter === "rent"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isAr ? "إيجار" : "Rent"}
                </button>
              </div>
            </div>

            {/* Filter 2: Bedrooms Count (All, 1, 2, 3, 4, 5+) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                <span>{isAr ? "عدد الغرف" : "Bedrooms"}</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {bedsFilter === "all" ? (isAr ? "الكل" : "Any") : `${bedsFilter} Beds`}
                </span>
              </label>
              <div className="grid grid-cols-6 gap-1 text-xs font-bold">
                {["all", "1", "2", "3", "4", "5+"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBedsFilter(b)}
                    className={`py-1.5 rounded-lg border text-center transition ${
                      bedsFilter === b
                        ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {b === "all" ? (isAr ? "الكل" : "All") : b}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 3: Price Range Preset Pills & Sliders */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                <span>{isAr ? "نطاق السعر" : "Price Range"}</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {categoryFilter === "rent" ? "EGP / Mo" : "EGP Total"}
                </span>
              </label>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap gap-1.5">
                {activePresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition ${
                      pricePreset === p.id
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow"
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {isAr ? p.labelAr : p.labelEn}
                  </button>
                ))}
              </div>

              {/* Min/Max Manual Display */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[9.5px]">Min</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {minPrice > 0 ? (minPrice >= 1000000 ? `${(minPrice / 1000000).toFixed(1)}M` : `${(minPrice / 1000).toFixed(0)}K`) : "0"} EGP
                  </span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[9.5px]">Max</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {maxPrice < 100000000 ? (maxPrice >= 1000000 ? `${(maxPrice / 1000000).toFixed(1)}M` : `${(maxPrice / 1000).toFixed(0)}K`) : "Max"} EGP
                  </span>
                </div>
              </div>
            </div>

            {/* Live Filter Count & Status Callout */}
            <div className="mt-auto pt-3 border-t border-slate-800 space-y-2">
              <div className="p-3 rounded-xl bg-linear-to-br from-cyan-950/40 to-slate-950 border border-cyan-500/30">
                <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                  <span>{isAr ? "نتائج التصفية" : "Filtered Matches"}</span>
                  <span className="text-cyan-400 font-mono font-extrabold">
                    {filteredRows.length} / {units.length}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {isAr
                    ? "تحديث فوري لجميع سجلات الوحدات المطابقة."
                    : "Real-time query applied across cadastral units."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE VIEW */}
        <div className="flex-1 overflow-auto relative flex flex-col bg-[#061122]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-3">
              <div className="w-9 h-9 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <p className="text-xs font-bold">
                {isAr ? "جاري مزامنة شيت المخزون المباشر…" : "Synchronizing live inventory from Supabase…"}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mb-1" />
              <p className="text-sm font-bold text-slate-300">
                {isAr ? "لا توجد وحدات تطابق معايير التصفية الحالية" : "No units match your selected filter criteria"}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-amber-400 hover:underline mt-1 font-semibold"
              >
                {isAr ? "إعادة ضبط جميع الفلاتر" : "Reset all filters"}
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-[#091a30] border-b border-slate-700/80 text-slate-300 font-bold uppercase tracking-wider text-[10.5px]">
                  <tr>
                    <th className="py-3 px-4">{isAr ? "كود سييرا" : "Sierra Code"}</th>
                    <th className="py-3 px-3">{isAr ? "الكمبوند" : "Compound"}</th>
                    <th className="py-3 px-3">{isAr ? "النوع" : "Type"}</th>
                    <th className="py-3 px-3">{isAr ? "المساحة" : "Area"}</th>
                    <th className="py-3 px-3">{isAr ? "غرف / حمامات" : "Beds/Baths"}</th>
                    <th className="py-3 px-3">{isAr ? "السعر (EGP)" : "Price (EGP)"}</th>
                    <th className="py-3 px-3">{isAr ? "السعر (USD)" : "Price (USD)"}</th>
                    <th className="py-3 px-3">{isAr ? "التشطيب" : "Finishing"}</th>
                    <th className="py-3 px-3">{isAr ? "المعاملة" : "Category"}</th>
                    <th className="py-3 px-4 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                  {filteredRows.map((u, idx) => {
                    const code = u.code || u.id;
                    const isRent = u.mode === "rent";
                    const priceFormatted = u.priceLabel || (u.price ? `${u.price.toLocaleString()} EGP` : "Upon Call");
                    const usdFormatted = u.usd ? `$${u.usd.toLocaleString()}` : (u.price ? `≈ $${Math.round(u.price / 49).toLocaleString()}` : "—");

                    return (
                      <tr key={code + idx} className="hover:bg-slate-800/50 transition-colors group">
                        {/* Sierra Code */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-cyan-300 group-hover:text-cyan-200">
                              {code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(code)}
                              className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition"
                              title="Copy code"
                            >
                              {copiedCode === code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Compound */}
                        <td className="py-3 px-3 font-sans font-semibold text-slate-200 whitespace-nowrap">
                          {u.compound || compoundName || "New Cairo"}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3 font-sans text-slate-300 whitespace-nowrap">
                          {u.propertyType || u.type || "Apartment"}
                        </td>

                        {/* Area */}
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {u.area ? `${u.area} m²` : "—"}
                        </td>

                        {/* Beds / Baths */}
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {u.beds != null ? `${u.beds}B` : "—"}
                          {u.bath != null ? ` / ${u.bath}Ba` : ""}
                        </td>

                        {/* Price EGP */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-bold text-amber-400">{priceFormatted}</span>
                        </td>

                        {/* Price USD */}
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {usdFormatted}
                        </td>

                        {/* Finishing */}
                        <td className="py-3 px-3 font-sans text-slate-300 whitespace-nowrap">
                          {u.finishingQuality || "Fully Finished"}
                        </td>

                        {/* Category badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-extrabold uppercase ${
                              isRent
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {isRent ? (isAr ? "إيجار" : "Rent") : (isAr ? "إعادة بيع" : "Resale")}
                          </span>
                        </td>

                        {/* Action Buttons: Request Photos + Direct WhatsApp */}
                        <td className="py-2.5 px-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Request Photos Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUnitForPhotos(u);
                                setLeadSuccess(false);
                                setFormError("");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-bold bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow hover:shadow-amber-500/20 active:scale-95 transition"
                            >
                              <Camera className="w-3 h-3" />
                              <span>{isAr ? "اطلب الصور" : "Photos"}</span>
                            </button>

                            {/* Direct WhatsApp VIP Button */}
                            <button
                              type="button"
                              onClick={() => handleDirectWhatsApp(u)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30 transition active:scale-95"
                              title={`Direct WhatsApp (${SIERRA_CONTACT_PHONE})`}
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-400" />
                              <span className="hidden lg:inline">{SIERRA_CONTACT_PHONE}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* BOTTOM FOOTER BAR */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-t border-slate-800 bg-[#07172c] text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {isAr
                  ? `مكتب سييرا للاستشارات العقارية: ${SIERRA_CONTACT_PHONE} (واتساب مباشر)`
                  : `Sierra Estates Advisory Desk: ${SIERRA_CONTACT_PHONE} (Direct WhatsApp)`}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {filteredRows.length} {isAr ? "من إجمالي" : "of"} {units.length} {isAr ? "وحدة" : "units"}
            </div>
          </div>
        </div>
      </div>

      {/* "SEND PHOTOS" LEAD CAPTURE MODAL */}
      {selectedUnitForPhotos && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#07172c] p-6 shadow-2xl font-sans text-slate-100">
            <button
              type="button"
              onClick={() => setSelectedUnitForPhotos(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-slate-900 border border-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {leadSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Check className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {isAr ? "تم إرسال طلب الصور بنجاح!" : "Photo Request Submitted!"}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
                    {isAr
                      ? `تم تحويل طلبك للوحدة (${selectedUnitForPhotos.code || selectedUnitForPhotos.id}) مباشرة لمستشارك العقاري على رقم ${SIERRA_CONTACT_PHONE}.`
                      : `Inquiry for unit ${selectedUnitForPhotos.code || selectedUnitForPhotos.id} forwarded to our desk at ${SIERRA_CONTACT_PHONE}.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUnitForPhotos(null)}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
                >
                  {isAr ? "العودة لجدول الوحدات" : "Back to Inventory Sheet"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendPhotoRequest} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isAr ? "طلب الصور والمعاينة الميدانية" : "Request Unit Photos & Inspection"}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">
                    {selectedUnitForPhotos.propertyType || "Unit"} ({selectedUnitForPhotos.code || selectedUnitForPhotos.id})
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                      {selectedUnitForPhotos.compound || compoundName || "New Cairo"}
                    </span>
                    {selectedUnitForPhotos.area && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                        {selectedUnitForPhotos.area} m²
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {selectedUnitForPhotos.priceLabel || `${selectedUnitForPhotos.price} EGP`}
                    </span>
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    {formError}
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isAr ? "الاسم الكامل *" : "Full Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={isAr ? "أدخل اسمك الكريم" : "Enter your full name"}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isAr ? "رقم الهاتف / الواتساب *" : "WhatsApp / Mobile Number *"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+20 100 000 0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isAr ? "البريد الإلكتروني (اختياري)" : "Email Address (Optional)"}
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isAr ? "ملاحظات المعاينة (اختياري)" : "Inspection / Photos Note"}
                    </label>
                    <textarea
                      rows={2}
                      value={inquiryNotes}
                      onChange={(e) => setInquiryNotes(e.target.value)}
                      placeholder={
                        isAr
                          ? "أرغب في استلام صور حقيقية عالية الدقة وتحديد موعد معاينة ميدانية."
                          : "Requesting verified photos and scheduling a viewing."
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 transition resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg hover:shadow-amber-500/25 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmittingLead ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        <span>{isAr ? "جاري الإرسال…" : "Submitting Request…"}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAr ? "طلب الصور والتواصل عبر واتساب" : "Send Photos & WhatsApp VIP"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
