"use client";
/**
 * SearchBar — buy/rent toggle + compound/type/beds/budget filters.
 * On submit, calls onSearch(filters) — the parent (Hero → page) passes
 * the filters down to ListingsGrid.
 */
import { useState } from "react";
import { Search, BedDouble, Building2, Tag, DollarSign } from "lucide-react";
import { useI18n } from "@/lib/i18n-client";
import { PROPERTY_TYPES, COMPOUND_ZONES } from "@/lib/seed";

export interface SearchFilters {
  mode: "sale" | "rent";
  compound?: string;
  type?: string;
  beds?: number;
  maxUsd?: number;
}

export function SearchBar({ onSearch, compact = false }: { onSearch: (f: SearchFilters) => void; compact?: boolean }) {
  const { t } = useI18n();
  const [f, setF] = useState<SearchFilters>({ mode: "sale" });

  return (
    <div className={`card p-3 sm:p-4 ${compact ? "" : "shadow-pop"}`}>
      <div className="flex flex-col gap-3">
        {/* Buy/Rent toggle */}
        <div className="inline-flex p-1 rounded-md bg-navy-900/5 self-start">
          {(["sale", "rent"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setF((s) => ({ ...s, mode: m }))}
              className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
                f.mode === m ? "bg-navy-900 text-cream" : "text-navy-900 hover:bg-navy-900/5"
              }`}
            >
              {m === "sale" ? t("search.buy") : t("search.rent")}
            </button>
          ))}
        </div>

        <div className={`grid gap-2 ${compact ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <select
              className="input pl-9"
              value={f.compound ?? ""}
              onChange={(e) => setF((s) => ({ ...s, compound: e.target.value || undefined }))}
            >
              <option value="">{t("search.compound")}: {t("listings.filter.all")}</option>
              {COMPOUND_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <select
              className="input pl-9"
              value={f.type ?? ""}
              onChange={(e) => setF((s) => ({ ...s, type: e.target.value || undefined }))}
            >
              <option value="">{t("search.type")}: {t("listings.filter.all")}</option>
              {PROPERTY_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
            </select>
          </div>

          <div className="relative">
            <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <select
              className="input pl-9"
              value={f.beds ?? ""}
              onChange={(e) => setF((s) => ({ ...s, beds: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">{t("search.beds")}: {t("listings.filter.all")}</option>
              {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+</option>)}
            </select>
          </div>

          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="number" min={0} step={500}
              placeholder={t("search.budget")}
              className="input pl-9"
              value={f.maxUsd ?? ""}
              onChange={(e) => setF((s) => ({ ...s, maxUsd: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          <button
            onClick={() => onSearch(f)}
            className="btn-gold sm:col-span-2 lg:col-span-1 lg:col-start-4"
          >
            <Search className="h-4 w-4" />
            {t("search.btn")}
          </button>
        </div>
      </div>
    </div>
  );
}
