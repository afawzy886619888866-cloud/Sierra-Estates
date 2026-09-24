"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  FileSpreadsheet,
  Camera,
  Copy,
  Check,
  Send,
  Download,
} from "lucide-react";
import type { InventoryUnit } from "@/lib/inventory/types";

export interface CompoundExcelSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  compoundName: string | null;
  /** Optional pre-loaded units list; if not provided or empty, will fetch from /api/inventory?compound=... */
  initialUnits?: InventoryUnit[];
  isAr?: boolean;
}

export default function CompoundExcelSheetModal({
  isOpen,
  onClose,
  compoundName,
  initialUnits = [],
  isAr = false,
}: CompoundExcelSheetModalProps) {
  const [units, setUnits] = useState<InventoryUnit[]>(initialUnits);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "rent" | "sale">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Lead inquiry dialog state
  const [selectedUnitForPhotos, setSelectedUnitForPhotos] =
    useState<InventoryUnit | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+20 ");
  const [clientEmail, setClientEmail] = useState("");
  const [inquiryNotes, setInquiryNotes] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch or filter units when modal opens
  useEffect(() => {
    if (!isOpen || !compoundName) return;

    // If pre-loaded units are provided, filter by compound name
    const cleanTarget = compoundName.toLowerCase().trim();
    const matchedInitial = initialUnits.filter((u) => {
      const cmp = (u.compound || u.location || "").toLowerCase().trim();
      return cmp.includes(cleanTarget) || cleanTarget.includes(cmp);
    });

    if (matchedInitial.length > 0) {
      setUnits(matchedInitial);
      return;
    }

    // Otherwise, fetch from /api/inventory?compound=...
    setLoading(true);
    fetch(`/api/inventory?compound=${encodeURIComponent(compoundName)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setLoading(false);
        if (data && Array.isArray(data.units)) {
          setUnits(data.units);
        }
      })
      .catch((err) => {
        console.warn(
          "[CompoundExcelSheetModal] Error fetching inventory:",
          err,
        );
        setLoading(false);
      });
  }, [isOpen, compoundName, initialUnits]);

  // Reset states when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedUnitForPhotos(null);
      setLeadSuccess(false);
      setFormError("");
      setSearchQuery("");
      setModeFilter("all");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (selectedUnitForPhotos) {
          setSelectedUnitForPhotos(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedUnitForPhotos, onClose]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let list = units;

    if (modeFilter !== "all") {
      list = list.filter((u) => u.mode === modeFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((u) => {
        const code = (u.code || u.id || "").toLowerCase();
        const type = (u.propertyType || u.type || "").toLowerCase();
        const price = (u.priceLabel || String(u.price || "")).toLowerCase();
        const finishing = (u.finishingQuality || "").toLowerCase();
        const notes = (u.description || "").toLowerCase();
        return (
          code.includes(q) ||
          type.includes(q) ||
          price.includes(q) ||
          finishing.includes(q) ||
          notes.includes(q)
        );
      });
    }

    return list;
  }, [units, modeFilter, searchQuery]);

  // Copy code helper
  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredRows.length) return;
    const headers = [
      "Code",
      "Compound",
      "Type",
      "Operation",
      "Area (sqm)",
      "Beds",
      "Baths",
      "Price (EGP)",
      "Price Label",
      "Finishing",
      "Status",
    ];
    const rows = filteredRows.map((u) => [
      `"${u.code || u.id}"`,
      `"${u.compound || compoundName || ""}"`,
      `"${u.propertyType || u.type || "Apartment"}"`,
      `"${u.mode}"`,
      u.area || "",
      u.beds || "",
      u.bath || "",
      u.price || "",
      `"${u.priceLabel || ""}"`,
      `"${u.finishingQuality || ""}"`,
      `"${u.status || "Available"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${compoundName || "Compound"}_Inventory_Sheet.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Photo Request submission
  const handleSendPhotoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!clientName.trim() || clientName.trim().length < 2) {
      setFormError(
        isAr
          ? "يرجى إدخال اسم العميل بشكل صحيح"
          : "Please enter your full name",
      );
      return;
    }

    const cleanPhone = clientPhone.replace(/[\s-]/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      setFormError(
        isAr
          ? "يرجى إدخال رقم هاتف واتساب صحيح"
          : "Please enter a valid WhatsApp number",
      );
      return;
    }

    if (!selectedUnitForPhotos) return;

    setIsSubmittingLead(true);

    const unit = selectedUnitForPhotos;
    const code = unit.code || unit.id;
    const cmp = unit.compound || compoundName || "New Cairo";
    const type = unit.propertyType || unit.type || "Apartment";
    const area = unit.area ? `${unit.area} m²` : "";
    const beds = unit.beds ? `${unit.beds} Beds` : "";
    const price =
      unit.priceLabel ||
      (unit.price ? `${unit.price.toLocaleString()} EGP` : "Price on request");

    const leadMessage = `[Photo & Viewing Request] Unit: ${code} in ${cmp} | Specs: ${type} ${area} ${beds} | Asking: ${price} | Client Note: ${inquiryNotes || "Requesting verified photos & floorplan"}`;

    try {
      // 1. Submit lead to CRM / Supabase
      const payload = {
        name: clientName.trim(),
        email:
          clientEmail.trim() ||
          `${cleanPhone.replace(/\+/g, "")}@lead.sierra-estates.net`,
        phone: cleanPhone,
        intent: unit.mode === "rent" ? "rent" : "buy",
        type: type,
        zone: unit.zone || cmp,
        budget: String(unit.price || 0),
        source: `excel_sheet_${cmp.replace(/\s+/g, "_")}`,
        message: leadMessage,
      };

      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 2. Open WhatsApp with pre-filled inquiry directly to Sierra Estates Desk (+201092048333)
      const waText = isAr
        ? `مرحبًا سييرا إستيتس، أنا مهتم بالوحدة كود (${code}) في كمبوند ${cmp}.\nالمواصفات: ${type} - ${area} - ${beds} - السعر: ${price}.\nأرجو إرسال الصور الحقيقية وتفاصيل المعاينة.\nالاسم: ${clientName}`
        : `Hello Sierra Estates, I am interested in unit code ${code} in ${cmp}.\nDetails: ${type}, ${area}, ${beds}, Price: ${price}.\nPlease send me verified photos and arrange an inspection.\nName: ${clientName}`;

      const waUrl = `https://wa.me/201092048333?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      setIsSubmittingLead(false);
      setLeadSuccess(true);
    } catch (err) {
      console.error("[CompoundExcelSheetModal] Lead submit error:", err);
      setIsSubmittingLead(false);
      // Still open WhatsApp even if network had an issue
      const waText = `Hello Sierra Estates, requesting photos for unit ${code} in ${cmp} (${price}). Name: ${clientName}`;
      window.open(
        `https://wa.me/201092048333?text=${encodeURIComponent(waText)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setLeadSuccess(true);
    }
  };

  if (!isOpen || !compoundName) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${compoundName} Inventory Sheet`}
      className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-500/30 bg-[#071523] text-slate-100 shadow-2xl overflow-hidden font-sans"
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 35px rgba(223, 173, 58, 0.15)",
        }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0a1b2c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {isAr
                    ? `شيت مخزون إكسل — ${compoundName}`
                    : `${compoundName} — Master Inventory Sheet`}
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {filteredRows.length} {isAr ? "وحدة متاحة" : "Units in Sheet"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'وحدات مسجلة بالشيت مباشرة. اضغط "📸 اطلب الصور" لطلب تصوير الوحدة والمعاينة.'
                  : 'Direct Excel & Airtable unphotographed records. Click "📸 Send Photos" to request verified photos and viewing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRows.length === 0}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-[#081726]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-60 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? "ابحث بالكود، السعر، المساحة، نوع الوحدة..."
                  : "Search by code, type, area, price, finishing..."
              }
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Operation Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setModeFilter("all")}
              className={`px-3 py-1 rounded-md font-medium transition ${
                modeFilter === "all"
                  ? "bg-amber-500 text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "الكل" : "All"}
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("sale")}
              className={`px-3 py-1 rounded-md font-medium transition ${
                modeFilter === "sale"
                  ? "bg-amber-500 text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "للبيع / إعادة بيع" : "For Sale"}
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("rent")}
              className={`px-3 py-1 rounded-md font-medium transition ${
                modeFilter === "rent"
                  ? "bg-emerald-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "للإيجار" : "For Rent"}
            </button>
          </div>
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="flex-1 overflow-auto relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <p className="text-sm">
                {isAr
                  ? "جاري تحميل شيت الإكسل…"
                  : "Loading inventory records from master sheet…"}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-semibold">
                {isAr
                  ? "لا توجد وحدات تطابق البحث"
                  : "No sheet listings match your filters"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setModeFilter("all");
                }}
                className="text-xs text-amber-400 hover:underline mt-1"
              >
                {isAr ? "إعادة ضبط الفلاتر" : "Reset filters"}
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-[#0a1d30] border-b border-slate-700 text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Sierra Code</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Area</th>
                  <th className="py-3 px-3">Beds / Baths</th>
                  <th className="py-3 px-3">Price (EGP)</th>
                  <th className="py-3 px-3">Price (USD)</th>
                  <th className="py-3 px-3">Finishing</th>
                  <th className="py-3 px-3">Operation</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11.5px]">
                {filteredRows.map((u, idx) => {
                  const code = u.code || u.id;
                  const isRent = u.mode === "rent";
                  return (
                    <tr
                      key={code + idx}
                      className="hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-bold text-amber-400 flex items-center gap-1.5">
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(code)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition p-0.5"
                          title="Copy Code"
                        >
                          {copiedCode === code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Property Type */}
                      <td className="py-3 px-3 font-sans text-slate-200">
                        {u.propertyType || u.type || "Apartment"}
                      </td>

                      {/* Area */}
                      <td className="py-3 px-3 text-slate-300">
                        {u.area ? `${u.area} m²` : "—"}
                      </td>

                      {/* Beds & Baths */}
                      <td className="py-3 px-3 text-slate-300 font-sans">
                        {u.beds ?? "—"} bds · {u.bath ?? "—"} ba
                      </td>

                      {/* Price EGP */}
                      <td className="py-3 px-3 font-bold text-white">
                        {u.priceLabel ||
                          (u.price
                            ? `${u.price.toLocaleString()} EGP`
                            : "On Request")}
                      </td>

                      {/* Price USD */}
                      <td className="py-3 px-3 text-slate-400">
                        {u.usd ? `$${u.usd.toLocaleString()}` : "—"}
                      </td>

                      {/* Finishing */}
                      <td className="py-3 px-3 font-sans text-slate-300">
                        {u.finishingQuality || u.furnishing || "Standard"}
                      </td>

                      {/* Operation */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-sans font-bold uppercase ${
                            isRent
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {u.mode}
                        </span>
                      </td>

                      {/* Send Photos Action Button */}
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnitForPhotos(u);
                            setLeadSuccess(false);
                            setFormError("");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-bold bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md hover:shadow-amber-500/20 active:scale-95 transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{isAr ? "اطلب الصور" : "Send Photos"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Footer Info */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#06121f] text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isAr
                ? "نظام التوثيق العقاري الفوري من سييرا — يتم تصوير ومطابقة الوحدات بالطلب"
                : "Sierra Real-Time Verification Engine — Units photographed on-demand"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              {filteredRows.length} of {units.length} total units
            </span>
          </div>
        </div>

        {/* "Send Photos" Lead Capture Drawer / Overlay Modal */}
        {selectedUnitForPhotos && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="relative w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[#0a1e33] p-6 shadow-2xl font-sans text-slate-100"
              style={{
                boxShadow:
                  "0 20px 40px rgba(0,0,0,0.8), 0 0 30px rgba(223, 173, 58, 0.25)",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedUnitForPhotos(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/80 transition"
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
                      {isAr
                        ? "تم إرسال طلب الصور بنجاح!"
                        : "Photo Request Submitted!"}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                      {isAr
                        ? `تم تسجيل طلبك للوحدة (${selectedUnitForPhotos.code}) وفتح محادثة واتساب مع مستشارك العقاري.`
                        : `Your inquiry for unit ${selectedUnitForPhotos.code} has been registered and WhatsApp opened to deliver verified photos.`}
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
                      <span>
                        {isAr
                          ? "طلب الصور والمعاينة الميدانية"
                          : "Request Unit Photos & Inspection"}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      {selectedUnitForPhotos.propertyType || "Unit"} (
                      {selectedUnitForPhotos.code})
                    </h4>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300 mt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {selectedUnitForPhotos.compound || compoundName}
                      </span>
                      {selectedUnitForPhotos.area && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {selectedUnitForPhotos.area} m²
                        </span>
                      )}
                      {selectedUnitForPhotos.beds && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {selectedUnitForPhotos.beds} Beds
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {selectedUnitForPhotos.priceLabel ||
                          `${selectedUnitForPhotos.price} EGP`}
                      </span>
                    </div>
                  </div>

                  {formError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isAr ? "الاسم الكامل *" : "Full Name *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder={
                          isAr ? "أدخل اسمك الكريم" : "Enter your full name"
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isAr
                          ? "رقم الهاتف / الواتساب *"
                          : "WhatsApp / Mobile Number *"}
                      </label>
                      <input
                        type="tel"
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="+20 100 000 0000"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isAr
                          ? "البريد الإلكتروني (اختياري)"
                          : "Email Address (Optional)"}
                      </label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isAr
                          ? "ملاحظات المعاينة (اختياري)"
                          : "Inspection / Photos Note"}
                      </label>
                      <textarea
                        rows={2}
                        value={inquiryNotes}
                        onChange={(e) => setInquiryNotes(e.target.value)}
                        placeholder={
                          isAr
                            ? "أرغب في استلام صور حقيقية عالية الدقة وتحديد موعد معاينة ميدانية."
                            : "Requesting verified photos, floor plan, and scheduling a viewing."
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 transition resize-none"
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
                          <span>
                            {isAr ? "جاري الإرسال…" : "Submitting Request…"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {isAr
                              ? "طلب الصور والتواصل واتساب"
                              : "Send Photos & Connect on WhatsApp"}
                          </span>
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
    </div>
  );
}
