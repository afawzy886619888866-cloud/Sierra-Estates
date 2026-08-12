"use client";
/**
 * PropertyDetail — modal showing a single listing with full info,
 * image gallery, agent contact CTA, and ROI preview.
 */
import Image from "next/image";
import {
  X, BedDouble, Bath, Maximize, MapPin, Sparkles, Phone, Mail,
  Calculator, Building2, Shield,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { fmtUSD, fmtArea, fmtScore, fmtEGPM, fmtYield, fmtPaybackYears } from "@/lib/format";

export function PropertyDetail({ l, onClose }: { l: Listing; onClose: () => void }) {
  // ROI proxy: monthly rent = 0.4% of price (typical Cairo yield)
  const monthlyRent = l.mode === "rent" ? l.usd : Math.round(l.usd * 0.004);
  const annualRent = monthlyRent * 12;
  const yld = fmtYield(annualRent, l.usd);
  const payback = fmtPaybackYears(annualRent, l.usd);

  return (
    <div className="fixed inset-0 z-[90] bg-navy-950/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="card w-full max-w-4xl my-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[16/9] sm:aspect-[2/1] bg-navy-900/5">
          <Image src={l.img} alt={l.compound} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" priority />
          <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 rounded-full glass flex items-center justify-center text-cream hover:bg-cream/20">
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {l.tag && <span className="badge-gold">{l.tag}</span>}
            <span className="badge bg-navy-950/80 text-cream">
              <Sparkles className="h-3 w-3 text-gold-300" />
              AI {fmtScore(l.aiScore)}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">{l.code}</p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mt-0.5">{l.type} in {l.compound}</h2>
              <p className="text-sm text-muted mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {l.zone} · New Cairo
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-navy-900">{fmtUSD(l.usd)}</p>
              {l.mode === "rent" && <p className="text-xs text-muted">per month</p>}
              <p className="text-xs text-gold-600 font-semibold mt-1">{fmtEGPM(l.egpM)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Stat icon={BedDouble} label="Bedrooms" value={String(l.beds)} />
            <Stat icon={Bath} label="Bathrooms" value={String(l.bath)} />
            <Stat icon={Maximize} label="Area" value={fmtArea(l.area)} />
            <Stat icon={Building2} label="Type" value={l.type} />
          </div>

          {l.description && (
            <div className="mt-5">
              <h3 className="font-serif text-lg font-bold mb-2">Description</h3>
              <p className="text-sm text-muted leading-relaxed">{l.description}</p>
            </div>
          )}

          {/* ROI preview */}
          <div className="mt-5 p-4 rounded-md bg-navy-900/5 border border-navy-900/10">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-gold-500" />
              <h4 className="font-semibold text-sm">ROI preview</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted">Est. monthly rent</p>
                <p className="font-bold">{fmtUSD(monthlyRent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Annual rent</p>
                <p className="font-bold">{fmtUSD(annualRent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Gross yield</p>
                <p className="font-bold text-gold-600">{yld.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted">Payback</p>
                <p className="font-bold">{payback.toFixed(1)} yrs</p>
              </div>
            </div>
          </div>

          {/* Agent CTA */}
          <div className="mt-5 p-4 rounded-md border border-border flex items-center gap-4 flex-wrap">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 font-bold">
              {l.agent.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{l.agent}</p>
              <p className="text-xs text-muted">Sierra Estates agent · listed {l.ago}</p>
            </div>
            <div className="flex gap-2">
              <a href="tel:+201001234567" className="btn-primary"><Phone className="h-4 w-4" /> Call</a>
              <a href="mailto:hello@sierra-estates.net" className="btn-outline"><Mail className="h-4 w-4" /> Email</a>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted">
            <Shield className="h-3.5 w-3.5" />
            <span>Verified listing · Last updated {l.ago}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-md bg-surface border border-border">
      <Icon className="h-4 w-4 text-gold-500 mb-1" />
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}
