"use client";

/**
 * Sierra Estates — Compound Units Deck (compact in-map Excel sheet)
 *
 * Pressing a two-letter flag pin on the masterplan opens THIS panel:
 * - Fitted exactly to the map command-deck area (absolute inset-0) — never a
 *   full-screen dialog.
 * - Solid opaque background: while the sheet is open the map is fully hidden
 *   ("without the map"), then reappears on close.
 * - Compact spreadsheet grid — tight paddings, 11px mono rows, sticky header.
 * - Live data from the parent's /api/inventory fetch (instant), with a
 *   compound-scoped API fallback if the parent had no units for it.
 * - Per-unit "Request Photos" mini lead flow (CRM POST + WhatsApp deep link).
 *
 * Anti-fabrication: missing price → "Price on request"; missing USD/area/
 * finishing render "—" — nothing is ever synthesized.
 */

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

export interface CompoundUnitsDeckProps {
  compoundName: string;
  /** Two-letter flag code shown on the map pin (deck header echoes it). */
  flagCode: string;
  /** Units already fetched by the parent (live /api/inventory payload). */
  units: InventoryUnit[];
  onClose: () => void;
  isAr?: boolean;
}

export default function CompoundUnitsDeck({
  compoundName,
  flagCode,
  units,
  onClose,
  isAr = false,
}: CompoundUnitsDeckProps) {
  const [localUnits, setLocalUnits] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "rent" | "sale">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Mini photo-request form state
  const [unitForPhotos, setUnitForPhotos] = useState<InventoryUnit | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+20 ");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Use parent-supplied units when they cover this compound; otherwise fetch
  // a compound-scoped list from the API.
  useEffect(() => {
    const target = compoundName.toLowerCase().trim();
    const matched = units.filter((u) => {
      const cmp = (u.compound || u.location || "").toLowerCase().trim();
      return cmp.includes(target) || target.includes(cmp);
    });
    if (matched.length > 0) {
      setLocalUnits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/inventory?compound=${encodeURIComponent(compoundName)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setLoading(false);
        if (data && Array.isArray(data.units)) setLocalUnits(data.units);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [compoundName, units]);

  // ESC: close photo form first, then the deck
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (unitForPhotos) setUnitForPhotos(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unitForPhotos, onClose]);

  const rows = useMemo(() => {
    const target = compoundName.toLowerCase().trim();
    let list = localUnits.length
      ? localUnits
      : units.filter((u) => {
          const cmp = (u.compound || u.location || "").toLowerCase().trim();
          return cmp.includes(target) || target.includes(cmp);
        });
    list = list.filter((u) => Boolean(u && u.id));
    if (modeFilter !== "all") list = list.filter((u) => u.mode === modeFilter);
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((u) => {
        const code = (u.code || u.id || "").toLowerCase();
        const type = (u.propertyType || u.type || "").toLowerCase();
        const price = (u.priceLabel || String(u.price || "")).toLowerCase();
        const fin = (u.finishingQuality || u.furnishing || "").toLowerCase();
        return code.includes(q) || type.includes(q) || price.includes(q) || fin.includes(q);
      });
    }
    return list;
  }, [localUnits, units, compoundName, modeFilter, searchQuery]);

  const totalCount = rows.length;

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1600);
    }
  };

  const handleExportCsv = () => {
    if (!rows.length) return;
    const headers = [
      "Code", "Compound", "Type", "Operation", "Area (sqm)", "Beds", "Baths",
      "Price (EGP)", "Price Label", "Finishing", "Status",
    ];
    const lines = rows.map((u) => [
      `"${u.code || u.id}"`,
      `"${u.compound || compoundName}"`,
      `"${u.propertyType || u.type || ""}"`,
      `"${u.mode}"`,
      u.area || "",
      u.beds ?? "",
      u.bath ?? "",
      u.price || "",
      `"${u.priceLabel || ""}"`,
      `"${u.finishingQuality || u.furnishing || ""}"`,
      `"${u.status || "available"}"`,
    ].join(","));
    const csv =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...lines].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `${compoundName.replace(/\s+/g, "_")}_Units.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePhotoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!unitForPhotos) return;
    const cleanName = clientName.trim();
    if (cleanName.length < 2) {
      setFormError(isAr ? "يرجى إدخال الاسم" : "Please enter your name");
      return;
    }
    const cleanPhone = clientPhone.replace(/[\s-]/g, "");
    if (cleanPhone.length < 8) {
      setFormError(isAr ? "يرجى إدخال رقم واتساب صحيح" : "Please enter a valid WhatsApp number");
      return;
    }
    setSubmitting(true);
    const unit = unitForPhotos;
    const code = unit.code || unit.id;
    const cmp = unit.compound || compoundName;
    const type = unit.propertyType || unit.type || "Unit";
    const area = unit.area ? `${unit.area} m²` : "";
    const beds = unit.beds ? `${unit.beds} Beds` : "";
    const price = unit.priceLabel || (unit.price ? `${unit.price.toLocaleString()} EGP` : "Price on request");
    const message = `[Photo & Viewing Request] Unit: ${code} in ${cmp} | Specs: ${type} ${area} ${beds} | Asking: ${price} | Source: map_flag_deck`;
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: `${cleanPhone.replace(/\+/g, "")}@lead.sierra-estates.net`,
          phone: cleanPhone,
          intent: unit.mode === "rent" ? "rent" : "buy",
          type,
          zone: unit.zone || cmp,
          budget: String(unit.price || 0),
          source: `map_deck_${cmp.replace(/\s+/g, "_")}`,
          message,
        }),
      });
    } catch {
      // Lead POST is best-effort; WhatsApp handoff below always proceeds.
    }
    const waText = isAr
      ? `مرحبًا سييرا إستيتس، أرغب في صور وتفاصيل الوحدة (${code}) في ${cmp} — ${type}, ${area}, ${beds}, السعر: ${price}. الاسم: ${cleanName}`
      : `Hello Sierra Estates, requesting photos for unit ${code} in ${cmp} — ${type}, ${area}, ${beds}, Price: ${price}. Name: ${cleanName}`;
    window.open(
      `https://wa.me/201092048333?text=${encodeURIComponent(waText)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setSubmitting(false);
    setUnitForPhotos(null);
  };

  const label = {
    units: isAr ? "وحدة" : "units",
    search: isAr ? "ابحث بالكود، النوع، السعر…" : "Search code, type, price…",
    all: isAr ? "الكل" : "All",
    sale: isAr ? "بيع" : "Sale",
    rent: isAr ? "إيجار" : "Rent",
    code: isAr ? "الكود" : "Sierra Code",
    type: isAr ? "النوع" : "Type",
    beds: isAr ? "غرف / حمامات" : "Beds / Baths",
    area: isAr ? "المساحة" : "Area",
    price: isAr ? "السعر" : "Price",
    fin: isAr ? "التشطيب" : "Finishing",
    op: isAr ? "العملية" : "Op",
    act: isAr ? "طلب" : "Action",
    empty: isAr ? "لا توجد وحدات مطابقة" : "No units match your filters",
    loading: isAr ? "جاري تحميل الوحدات…" : "Loading units…",
    photos: isAr ? "اطلب الصور" : "Photos",
    csv: isAr ? "CSV" : "CSV",
    reset: isAr ? "مسح الفلاتر" : "Reset filters",
    name: isAr ? "الاسم *" : "Name *",
    phone: isAr ? "واتساب *" : "WhatsApp *",
    send: isAr ? "إرسال الطلب" : "Send Request",
    closeForm: isAr ? "إلغاء" : "Cancel",
    onReq: isAr ? "حسب الطلب" : "On request",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${compoundName} units sheet`}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 500,
        background: "#071523",
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", sans-serif',
        color: "#e2e8f0",
      }}
    >
      {/* Compact header — 44px */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#0a1b2c",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#14283d",
            border: "1.5px solid rgba(223,173,58,0.7)",
            borderRadius: "8px 8px 8px 2px",
            color: "#e9c176",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {flagCode}
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {compoundName}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: 999,
            background: "rgba(16,185,129,0.14)",
            color: "#34d399",
            border: "1px solid rgba(16,185,129,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          {totalCount} {label.units}
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!rows.length}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 9px",
            borderRadius: 7,
            fontSize: 10.5,
            fontWeight: 700,
            background: "rgba(255,255,255,0.07)",
            color: "#cbd5e1",
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: rows.length ? "pointer" : "default",
            opacity: rows.length ? 1 : 0.45,
            whiteSpace: "nowrap",
          }}
        >
          <Download style={{ width: 11, height: 11 }} />
          <span>{label.csv}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? "إغلاق" : "Close"}
          style={{
            width: 26,
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 7,
            background: "rgba(255,255,255,0.07)",
            color: "#94a3b8",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Compact toolbar — search + operation tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "#081726",
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 120, maxWidth: 340 }}>
          <Search style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "#64748b" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={label.search}
            style={{
              width: "100%",
              padding: "5px 8px 5px 26px",
              borderRadius: 7,
              background: "rgba(15,30,48,0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
              fontSize: 11,
              outline: "none",
            }}
          />
        </div>
        <div
          style={{
            display: "inline-flex",
            gap: 2,
            padding: 2,
            borderRadius: 8,
            background: "rgba(15,30,48,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}
        >
          {(["all", "sale", "rent"] as const).map((m) => {
            const active = modeFilter === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: active ? 800 : 600,
                  border: "none",
                  cursor: "pointer",
                  background: active
                    ? m === "rent"
                      ? "#059669"
                      : m === "sale"
                      ? "#dfad3a"
                      : "rgba(255,255,255,0.14)"
                    : "transparent",
                  color: active ? (m === "all" ? "#e2e8f0" : "#071523") : "#94a3b8",
                }}
              >
                {label[m]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spreadsheet grid */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 0", color: "#94a3b8", fontSize: 12 }}>
            <span style={{ width: 18, height: 18, border: "2px solid rgba(223,173,58,0.3)", borderTopColor: "#dfad3a", borderRadius: "50%", display: "inline-block", animation: "spin 0.9s linear infinite" }} />
            <span>{label.loading}</span>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "44px 16px", color: "#94a3b8", textAlign: "center" }}>
            <FileSpreadsheet style={{ width: 26, height: 26, color: "#334155" }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{label.empty}</span>
            {(searchQuery || modeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setModeFilter("all");
                }}
                style={{ background: "transparent", border: "none", color: "#dfad3a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                {label.reset}
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 10, background: "#0a1d30", borderBottom: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 800 }}>{label.code}</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 800 }}>{label.type}</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 800 }}>{label.beds}</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 800, display: "table-cell" }}>{label.area}</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 800 }}>{label.price}</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 800 }}>{label.fin}</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 800 }}>{label.op}</th>
                <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800 }}>{label.act}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u, idx) => {
                const code = u.code || u.id;
                const isRent = u.mode === "rent";
                const priceText =
                  u.priceLabel ||
                  (Number(u.price) > 0
                    ? isRent && Number(u.usd) > 0
                      ? `$${Number(u.usd).toLocaleString()}/mo`
                      : `EGP ${Number(u.price).toLocaleString()}`
                    : label.onReq);
                return (
                  <tr
                    key={(code || "") + idx}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.035)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "5px 10px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700, color: "#dfad3a", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(code)}
                          title="Copy code"
                          style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 1, display: "inline-flex" }}
                        >
                          {copiedCode === code ? <Check style={{ width: 11, height: 11, color: "#34d399" }} /> : <Copy style={{ width: 11, height: 11 }} />}
                        </button>
                      </span>
                    </td>
                    <td style={{ padding: "5px 8px", color: "#e2e8f0", whiteSpace: "nowrap" }}>
                      {u.propertyType || u.type || "—"}
                    </td>
                    <td style={{ padding: "5px 8px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                      {u.beds ?? "—"} · {u.bath ?? "—"}
                    </td>
                    <td style={{ padding: "5px 8px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                      {u.area ? `${u.area} m²` : "—"}
                    </td>
                    <td style={{ padding: "5px 8px", fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap" }}>
                      {priceText}
                    </td>
                    <td style={{ padding: "5px 8px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                      {u.finishingQuality || u.furnishing || "—"}
                    </td>
                    <td style={{ padding: "5px 8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "1px 7px",
                          borderRadius: 5,
                          fontSize: 9.5,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          background: isRent ? "rgba(5,150,105,0.18)" : "rgba(223,173,58,0.16)",
                          color: isRent ? "#34d399" : "#e9c176",
                          border: `1px solid ${isRent ? "rgba(5,150,105,0.35)" : "rgba(223,173,58,0.35)"}`,
                        }}
                      >
                        {u.mode}
                      </span>
                    </td>
                    <td style={{ padding: "4px 10px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setUnitForPhotos(u);
                          setFormError("");
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 9px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          background: "linear-gradient(135deg, #dfad3a, #c8961a)",
                          color: "#071523",
                          border: "none",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Camera style={{ width: 10, height: 10 }} />
                        <span>{label.photos}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mini footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "#06121f",
          fontSize: 9.5,
          color: "#64748b",
          flexShrink: 0,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
          <span>{isAr ? "مخزون حي — سييرا إستيتس" : "Live inventory — Sierra Estates"}</span>
        </span>
        <span>ESC ✕</span>
      </div>

      {/* Photo request mini-form overlay (fitted inside the deck) */}
      {unitForPhotos && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(4,10,18,0.82)",
          }}
        >
          <form
            onSubmit={handlePhotoRequest}
            style={{
              width: "100%",
              maxWidth: 300,
              background: "#0a1e33",
              border: "1px solid rgba(223,173,58,0.4)",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: "#dfad3a", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <Camera style={{ width: 12, height: 12 }} />
              <span>{isAr ? "طلب الصور والمعاينة" : "Request Photos & Viewing"}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>
              {unitForPhotos.propertyType || unitForPhotos.type || "Unit"} · {unitForPhotos.code || unitForPhotos.id}
            </div>
            {formError && (
              <div style={{ padding: "5px 8px", borderRadius: 7, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 10.5 }}>
                {formError}
              </div>
            )}
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={label.name}
              style={{ width: "100%", padding: "6px 9px", borderRadius: 7, background: "rgba(15,30,48,0.9)", border: "1px solid rgba(255,255,255,0.14)", color: "#ffffff", fontSize: 11, outline: "none" }}
            />
            <input
              type="tel"
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder={label.phone}
              style={{ width: "100%", padding: "6px 9px", borderRadius: 7, background: "rgba(15,30,48,0.9)", border: "1px solid rgba(255,255,255,0.14)", color: "#ffffff", fontSize: 11, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 7 }}>
              <button
                type="button"
                onClick={() => setUnitForPhotos(null)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}
              >
                {label.closeForm}
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ flex: 2, padding: "7px 0", borderRadius: 8, background: "linear-gradient(135deg, #dfad3a, #c8961a)", color: "#071523", fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, opacity: submitting ? 0.6 : 1 }}
              >
                <Send style={{ width: 11, height: 11 }} />
                <span>{submitting ? (isAr ? "جاري الإرسال…" : "Sending…") : label.send}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        input::placeholder {
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
