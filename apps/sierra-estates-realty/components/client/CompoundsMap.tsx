"use client";
/**
 * CompoundsMap — uses Leaflet (CDN-loaded dynamically to avoid SSR).
 * Shows 52 compound markers with popups (AI score, growth, price/m, rent).
 * Tinted gold (high score) → navy (lower).
 *
 * IMPORTANT: Leaflet is loaded via <link> + <script> from unpkg at runtime
 * so we don't add a hard npm dependency. If offline, the section gracefully
 * shows the table view.
 */
import { useEffect, useRef, useState } from "react";
import { MapPin, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-client";
import { api } from "@/lib/api-client";
import { fmtScore } from "@/lib/format";
import type { Compound } from "@/lib/types";

declare global {
  interface Window { L?: any; }
}

export function CompoundsMap() {
  const { t } = useI18n();
  const [items, setItems] = useState<Compound[]>([]);
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Compound | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);

  // Load data & live inventory counts
  useEffect(() => {
    Promise.all([
      api.compounds().catch(() => [] as Compound[]),
      fetch('/api/inventory').then((r) => r.json()).catch(() => ({ units: [] })),
    ])
      .then(([compoundsData, invData]) => {
        setItems(compoundsData);
        const counts: Record<string, number> = {};
        if (invData?.units && Array.isArray(invData.units)) {
          invData.units.forEach((u: any) => {
            const name = (u.location || u.rawLocation || '').toLowerCase().trim();
            if (name) {
              counts[name] = (counts[name] || 0) + 1;
            }
          });
        }
        setUnitCounts(counts);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load Leaflet CSS + JS once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.L) { setLeafletReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  // Initialize map when both ready
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInst.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [30.04, 31.6],
      zoom: 11,
      scrollWheelZoom: false,
      zoomControl: true,
      touchZoom: true,
      dragging: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap · CARTO",
      maxZoom: 18,
    }).addTo(map);
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, [leafletReady]);

  // Add markers when items arrive
  useEffect(() => {
    if (!leafletReady || !mapInst.current || items.length === 0) return;
    const L = window.L;
    items.forEach((c) => {
      const color = c.aiScore >= 9 ? "#c8961a" : c.aiScore >= 8.5 ? "#0d2136" : "#4a5568";
      const key = c.name.toLowerCase().trim();
      const count = unitCounts[key] || 0;

      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 8 + (c.aiScore - 8) * 4,
        fillColor: color, color: "#fff", weight: 2, fillOpacity: 0.9,
      }).addTo(mapInst.current);
      marker.bindPopup(
        `<div style="min-width:180px">
          <strong>${c.name}</strong><br>
          <span style="color:#e9c176">${c.zone}</span><br>
          AI: ${c.aiScore.toFixed(1)} · Growth: ${c.growth}<br>
          ${c.priceM}K EGP/m² · ${c.rent} EGP/mo<br>
          <span style="color:#16a34a;font-weight:bold;font-size:11px;">${count > 0 ? `${count} Active Listings` : 'Master Inventory'}</span>
        </div>`
      );
      marker.on("click", () => setSelected(c));
    });
  }, [leafletReady, items, unitCounts]);

  return (
    <section id="compounds" className="py-20 bg-navy-950 text-cream scroll-mt-20">
      <div className="container-page">
        <div className="mb-8">
          <p className="section-eyebrow !text-gold-300">{t("compounds.subtitle")}</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2 text-cream">{t("compounds.title")}</h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-lg overflow-hidden border border-cream/10 h-[480px] bg-navy-900">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
              </div>
            ) : (
              <div ref={mapRef} className="h-full w-full" />
            )}
          </div>

          <div className="card !bg-navy-900 !border-cream/10 !text-cream p-0 overflow-hidden h-[480px] flex flex-col">
            <div className="p-4 border-b border-cream/10">
              <h3 className="font-serif text-lg font-bold text-cream">
                {selected ? selected.name : "Top compounds"}
              </h3>
              <p className="text-xs text-cream/60">
                {selected ? selected.zone : "Click a marker to inspect"}
              </p>
            </div>
            <div className="overflow-y-auto flex-1">
              {(selected ? [selected] : items.slice(0, 8)).map((c) => {
                const count = unitCounts[c.name.toLowerCase().trim()] || 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="w-full text-left p-4 border-b border-cream/5 hover:bg-cream/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-sm text-cream">{c.name}</p>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800/40">
                            {count} units
                          </span>
                        )}
                        <span className="badge-gold">{fmtScore(c.aiScore)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-cream/70">
                      <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-gold-300" /> {c.growth}</div>
                      <div className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-gold-300" /> {c.priceM}K</div>
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-gold-300" /> {c.zone.slice(0, 8)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selected && (
              <div className="p-3 border-t border-cream/10">
                <button onClick={() => setSelected(null)} className="text-xs text-cream/60 hover:text-cream">← Back to top compounds</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
