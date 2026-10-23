"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Phone,
  Image as ImageIcon,
  Send,
  RefreshCw,
  Leaf,
  Zap,
} from "lucide-react";
import { ECO_SMART_TAGS, extractEcoSmartTags } from "@/lib/services/listing-normalize";

interface ParsedListingData {
  compound: string | null;
  propertyType: string | null;
  mode: "sale" | "rent";
  beds: number | null;
  baths: number | null;
  area: number | null;
  gardenArea?: number | null;
  price: number | null;
  downpayment?: number | null;
  finishing: string | null;
  ownerName: string | null;
  mobile: string | null;
  features: string[];
  tags?: string[];
  sierraCode: string | null;
  aiScore: number | null;
  aiSummary: string | null;
  confidence: number;
}

const REAL_OWNER_PRESETS = [
  {
    name: 'Fifth Square (8.8M)',
    text: 'للبيع شقة ارضي بجاردن في كمبوند فيفث سكوير المراسم التجمع الخامس\nمساحة 165م + حديقة 70م خاصة\n3 غرف نوم + 2 حمام + ريسبشن واسع\nنصف تشطيب استلام فوري\nالسعر: 8,800,000 ج كاش\nالمالك المباشر عمرو مرسي: 01013995871',
  },
  {
    name: 'Al Rehab (11.5M)',
    text: 'شقة للبيع بمدينة الرحاب المرحلة الرابعة فيو جاردن مفتوح\nمساحة 155 متر، 3 غرف و 2 حمام\nتشطيب الترا سوبر لوكس\nالسعر المطلوب: 11,500,000 جنيه كاش نهائي\nللتواصل مع المالك ا. ليلى فريد: 01228774975',
  },
  {
    name: 'Mivida (Rent 85k)',
    text: 'للايجار شقة فاخرة مفروشة بالكامل في ميفيدا إعمار\nمساحة 185م فيو بحيرات مباشرة\n3 غرف ماستر + 3 حمامات + تكييف مركزي\nالايجار الشهري: 85,000 ج\nالتواصل: 01001234567',
  },
  {
    name: 'Madinaty (8.34M)',
    text: 'للبيع شقة ممتازة في مدينتي B14 طلعت مصطفى\nمساحة 133 متر دور متكرر فيو بارك\n3 نوم + 2 حمام + تراس كبير\nالسعر: 8,340,000 ج شامل الوديعة\nالمالك محمد: 01022844661',
  },
];

export default function EasyListingStudio({
  onListingPublishedAction,
  lang = "en",
}: {
  onListingPublishedAction?: (listing: any) => void;
  lang?: string;
}) {
  const isAr = lang === "ar";
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Structured Editable Form — starts EMPTY: no fabricated demo listing.
  // Every field the parser cannot find in the text stays null until the
  // operator fills it (§21: never prefill plausible-looking invented data).
  const [formData, setFormData] = useState<ParsedListingData>({
    compound: null,
    propertyType: null,
    mode: "sale",
    beds: null,
    baths: null,
    area: null,
    gardenArea: 0,
    price: null,
    downpayment: null,
    finishing: null,
    ownerName: null,
    mobile: null,
    features: [],
    tags: [],
    sierraCode: null,
    aiScore: null,
    aiSummary: null,
    confidence: 0,
  });

  const pricePerSqm =
    formData.area && formData.price && formData.area > 0
      ? Math.round(formData.price / formData.area)
      : 0;

  const handleAIParse = async () => {
    if (!rawText.trim()) {
      setErrorMsg(
        isAr
          ? "يرجى إدخال نص العقار أولاً"
          : "Please enter property text or paste WhatsApp message first",
      );
      return;
    }

    setIsParsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/listings/easy-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          source: "whatsapp",
          images: imageUrls,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to parse listing");
      }

      const autoTags = extractEcoSmartTags(rawText);
      const combinedTags = Array.from(new Set([...(json.data.tags || []), ...autoTags]));
      setFormData({
        ...json.data,
        tags: combinedTags,
      });

      const missing: string[] = json.missing || [];
      const missingNote = missing.length
        ? ` — fill manually: ${missing.join(", ")}`
        : "";
      setSuccessMsg(
        isAr
          ? `✓ تم تحليل البيانات بنسبة دقة ${(json.data.confidence * 100).toFixed(0)}% (${json.source})${missing.length ? " — أكمل الحقول الناقصة يدوياً" : ""}`
          : `✓ AI Extracted successfully (${json.source}, ${(json.data.confidence * 100).toFixed(0)}% confidence)${missingNote}`,
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect to AI Parser");
    } finally {
      setIsParsing(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        compound: formData.compound || "",
        propertyType: formData.propertyType || "",
        mode: formData.mode,
        offerType: formData.mode,
        beds: formData.beds,
        baths: formData.baths,
        area: formData.area,
        gardenArea: formData.gardenArea ?? 0,
        price: formData.price,
        finishing: formData.finishing || "",
        ownerName: formData.ownerName || "",
        mobile: formData.mobile || "",
        comment: formData.aiSummary || "",
        tags: formData.tags || [],
        photos: imageUrls,
        images: imageUrls,
      };

      const res = await fetch("/api/listings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to publish listing");
      }

      setSuccessMsg(
        isAr
          ? `✓ تم نشر العقار بنجاح! كود العقار: ${json.listingCode || formData.sierraCode}`
          : `✓ Successfully published to inventory! Ref: ${json.listingCode || formData.sierraCode}`,
      );
      if (onListingPublishedAction) onListingPublishedAction(json);
    } catch (err: any) {
      setErrorMsg(err.message || "Error publishing listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addImage = () => {
    if (newImageUrl.trim() && !imageUrls.includes(newImageUrl.trim())) {
      setImageUrls([...imageUrls, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-linear-to-r from-slate-900/90 via-slate-900/60 to-[#211A0D]/40 border border-[#C8961A]/20 backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C8961A]/10 text-[#E9C176] border border-[#C8961A]/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-white tracking-wide">
              {isAr
                ? "استوديو الإدراج السريع · Easy Listing Studio"
                : "Easy Listing Studio · The Scribe AI"}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "تحويل نصوص ورسائل واتساب غير المنظمة إلى عقارات مفحوصة ومطابقة لمعايير سيير ايستيتس بنقرة واحدة"
              : "Paste unstructured WhatsApp/broker messages to auto-extract luxury specs, SBR codes, and publish to inventory in seconds."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-mono rounded-full bg-[#C8961A]/10 text-[#F5D78E] border border-[#C8961A]/30">
            Vercel AI SDK • Active
          </span>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2-Column Workflow Studio — Clay Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Raw Intake & AI Trigger */}
        <div className="lg:col-span-5 space-y-4">
          <div className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-[#E9C176]" />
                {isAr
                  ? "نص العقار الخام (واتساب / مسودة)"
                  : "Raw Property Text / WhatsApp Intake"}
              </label>
              <button
                type="button"
                onClick={() =>
                  setRawText(
                    `للبيع شقة مميزة جدا في ميفيدا التجمع الخامس\nمساحة 185م + فيو بحيرات مباشرة\n3 غرف نوم + 2 حمام + ريسبشن كبير\nتشطيب الترا سوبر لوكس\nالسعر المطلوب: 14,500,000 ج\nللتواصل والمعاينة: 01001234567`,
                  )
                }
                className="text-[10px] text-[#E9C176] hover:text-[#F5D78E] underline cursor-pointer"
              >
                {isAr ? "تحميل افتراضي" : "Reset Default"}
              </button>
            </div>

            {/* Quick Real Owner Presets */}
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-semibold text-slate-400 block font-mono">
                {isAr ? '⚡ نماذج سريعة من عقارات الملاك الحقيقية:' : '⚡ Quick Presets from Real Inventory:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REAL_OWNER_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setRawText(p.text)}
                    className="clay-stat-badge bg-slate-900/90 hover:bg-[#211A0D] border border-slate-700 hover:border-[#C8961A]/50 text-slate-300 hover:text-[#F5D78E] cursor-pointer text-[10px] py-1 px-2.5 transition-all"
                  >
                    <span>✦</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="clay-inset p-2">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={7}
                placeholder={
                  isAr
                    ? "الصق رسالة الواتساب أو وصف العقار هنا..."
                    : 'Paste WhatsApp forward, broker draft, or freeform property specs here...\ne.g. "For sale villa in Hyde Park 350m, 4 beds, garden 120m, 22M EGP, contact 0109..."'
                }
                className="w-full bg-transparent border-0 text-white placeholder-slate-500 text-xs font-mono focus:outline-none resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAIParse}
              disabled={isParsing || !rawText.trim()}
              className="clay-btn-gold w-full py-3 px-4 text-xs font-bold gap-2 disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {isAr
                      ? "جاري التحليل بالذكاء الاصطناعي..."
                      : "AI Scribe Neural Parsing..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isAr
                      ? "تحليل بالذكاء الاصطناعي وتعبئة النموذج"
                      : "Parse with AI & Auto-Fill"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Photo Gallery & Uploads */}
          <div className="clay-card p-5 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-[#E9C176]" />
              {isAr ? "صور العقار" : "Property Media / Photos"}
            </label>

            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://paste-direct-photo-url…"
                className="flex-1 p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
              />
              <button
                type="button"
                onClick={addImage}
                className="clay-btn-dark px-3.5 py-2 text-[#E9C176] text-xs font-bold"
              >
                + Add
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              {imageUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-video bg-slate-950 shadow-inner"
                >
                  <Image
                    src={url}
                    alt="Listing preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-600 text-white rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Structured Extracted Form & Instant Publish */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handlePublish}
            className="clay-card-elevated p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#E9C176]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {isAr
                    ? "البيانات المنظمة للمخزون (قيد المراجعة)"
                    : "Inventory Specification (Pending Verification)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="clay-stat-badge bg-[#211A0D] border border-[#C8961A]/40 text-[#E9C176]">
                  {formData.sierraCode ?? "—"}
                </span>
                <span className="clay-stat-badge bg-purple-950/80 border border-purple-800/60 text-purple-300">
                  AI: {formData.aiScore ?? "—"}/10
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Compound */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isAr ? "المجمع / الكمبوند" : "Compound / Master Project"}
                </label>
                <input
                  type="text"
                  value={formData.compound ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, compound: e.target.value || null })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                  required
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isAr ? "نوع العقار" : "Property Type"}
                </label>
                <select
                  value={formData.propertyType ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, propertyType: e.target.value || null })
                  }
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                >
                  <option value="" disabled>
                    {isAr ? "— اختر النوع —" : "— select type —"}
                  </option>
                  <option value="Apartment">Apartment</option>
                  <option value="Standalone Villa">Standalone Villa</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Twin House">Twin House</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Duplex">Duplex</option>
                  <option value="Chalet">Chalet</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    {isAr ? "السعر المطلوب (EGP)" : "Price (EGP)"}
                  </label>
                  {pricePerSqm > 0 && (
                    <span className="clay-stat-badge bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] py-0.5 px-2 font-mono">
                      {pricePerSqm.toLocaleString()} EGP/m²
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={formData.price ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-[#C8961A]"
                  required
                />
              </div>

              {/* Offer Type Toggle (Sale / Rent) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isAr ? "نوع العرض (بيع / إيجار)" : "Offer Type (Sale / Rent)"}
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mode: "sale" })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.mode === "sale"
                        ? "bg-[#C8961A] text-slate-950 shadow-md font-extrabold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isAr ? "للبيع (Sale)" : "For Sale"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mode: "rent" })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.mode === "rent"
                        ? "bg-[#C8961A] text-slate-950 shadow-md font-extrabold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isAr ? "للإيجار (Rent)" : "For Rent"}
                  </button>
                </div>
              </div>

              {/* Beds & Baths */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {isAr ? "الغرف" : "Bedrooms"}
                  </label>
                  <input
                    type="number"
                    value={formData.beds ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        beds: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    required
                    className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {isAr ? "الحمامات" : "Bathrooms"}
                  </label>
                  <input
                    type="number"
                    value={formData.baths ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baths: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    required
                    className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                  />
                </div>
              </div>

              {/* Area & Garden */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {isAr ? "المساحة (م²)" : "Area (m²)"}
                  </label>
                  <input
                    type="number"
                    value={formData.area ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        area: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    required
                    className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {isAr ? "الحديقة (م²)" : "Garden (m²)"}
                  </label>
                  <input
                    type="number"
                    value={formData.gardenArea ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gardenArea: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                  />
                </div>
              </div>

              {/* Finishing */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isAr ? "حالة التشطيب" : "Finishing Status"}
                </label>
                <select
                  value={formData.finishing ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, finishing: e.target.value || null })
                  }
                  required
                  className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                >
                  <option value="" disabled>
                    {isAr ? "— اختر التشطيب —" : "— select finishing —"}
                  </option>
                  <option value="Fully Finished">
                    Fully Finished / Super Lux
                  </option>
                  <option value="Semi Finished">Semi Finished</option>
                  <option value="Core & Shell">Core & Shell</option>
                  <option value="Fully Furnished">Fully Furnished</option>
                </select>
              </div>

              {/* Owner Contact */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#E9C176]" />
                  {isAr ? "هاتف المالك / الوسيط" : "Contact Mobile"}
                </label>
                <input
                  type="text"
                  value={formData.mobile ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value || null })
                  }
                  className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
                  required
                />
              </div>
            </div>

            {/* Eco & Smart Compound Tagging Control */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  {isAr ? "وسوم الاستدامة والذكاء (Eco & Smart Tags)" : "Eco & Smart Compound Tags"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isAr ? "انقر للتبديل" : "Click to toggle"}
                </span>
              </label>
              <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80">
                {ECO_SMART_TAGS.map((t) => {
                  const active = (formData.tags || []).includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const current = formData.tags || [];
                        const next = active
                          ? current.filter((id) => id !== t.id)
                          : [...current, t.id];
                        setFormData({ ...formData, tags: next });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? t.category === "eco"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm"
                          : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {active ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      )}
                      <span>{isAr ? t.labelAr : t.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Luxury Summary */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                {isAr
                  ? "الوصف التسويقي المعزز بالذكاء الاصطناعي"
                  : "AI Luxury Brochure Description"}
              </label>
              <textarea
                value={formData.aiSummary ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, aiSummary: e.target.value || null })
                }
                rows={2}
                className="w-full p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C8961A]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="clay-btn-emerald px-6 py-2.5 text-xs font-bold gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {isAr ? "جاري النشر..." : "Publishing to Database..."}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isAr
                        ? "نشر العقار في قاعدة البيانات"
                        : "Publish to Live Inventory"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
