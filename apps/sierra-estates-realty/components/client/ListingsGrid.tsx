"use client";
/**
 * ListingsGrid — fetches /api/listings with the active filters,
 * renders a responsive grid of PropertyCards. Manages selection state
 * and renders PropertyDetail when a card is clicked.
 */
import { useEffect, useState } from "react";
import { Loader2, Building2, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n-client";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/client/Toast";
import { PropertyCard } from "./PropertyCard";
import { PropertyDetail } from "./PropertyDetail";
import { SearchBar, type SearchFilters } from "./SearchBar";
import type { Listing } from "@/lib/types";

export function ListingsGrid({ initialFilters }: { initialFilters?: SearchFilters }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [filters, setFilters] = useState<SearchFilters | undefined>(initialFilters);
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Listing | null>(null);

  // Sync external filter changes (e.g. when Hero search is submitted
  // after this component has already mounted).
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
      // Scroll to listings section after a search from the hero.
      document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [initialFilters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.listings(filters as any)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch((err) => {
        if (!cancelled) {
          toast({ title: t("form.error"), description: err.message, kind: "error" });
          setItems([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, t, toast]);

  return (
    <section id="listings" className="py-20 scroll-mt-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <p className="section-eyebrow">{t("listings.subtitle")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2">{t("listings.title")}</h2>
          </div>
          <div className="text-sm text-muted flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {loading ? "…" : `${items.length} ${items.length === 1 ? "listing" : "listings"}`}
          </div>
        </div>

        <div className="mb-6">
          <SearchBar onSearch={setFilters} compact />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="card p-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted mb-3" />
            <p className="text-muted">{t("listings.empty")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <PropertyCard key={l.id} l={l} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && <PropertyDetail l={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
