"use client";
/**
 * PropertyCard — luxury property card component with AI score badges,
 * tactile interactions, spring hover physics, and liquid glass styling.
 */
import Image from "next/image";
import { BedDouble, Bath, Maximize, MapPin, Sparkles, Heart, ArrowUpRight } from "lucide-react";
import type { Listing } from "@/lib/types";
import { fmtUSD, fmtArea, fmtScore } from "@/lib/format";
import { useState } from "react";

export function PropertyCard({ l, onSelect }: { l: Listing; onSelect: (l: Listing) => void }) {
  const [saved, setSaved] = useState(false);

  return (
    <article
      className="glass-panel rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-2xl group cursor-pointer flex flex-col btn-tactile relative"
      onClick={() => onSelect(l)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        <Image
          src={l.img}
          alt={`${l.type} in ${l.compound}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          {l.tag && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider gold-gradient text-slate-950 gold-glow">
              {l.tag}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-slate-200 border border-white/10">
            {l.mode === "sale" ? "For Sale" : "For Rent"}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setSaved((v) => !v);
          }}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-slate-800/80 transition btn-tactile z-10"
          aria-label="Save Property"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 backdrop-blur-md text-amber-300 border border-amber-500/30">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>AI Match {fmtScore(l.aiScore)}</span>
          </span>
          <span className="text-[11px] text-slate-300 font-mono backdrop-blur-sm px-2 py-0.5 rounded bg-black/40">
            {l.ago}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
                {l.code}
              </p>
              <h3 className="font-display text-xl font-bold text-white leading-tight mt-0.5 group-hover:text-amber-300 transition-colors">
                {l.type}
              </h3>
            </div>
            <div className="text-right">
              <p className="font-bold text-white text-lg font-mono gold-gradient-text">
                {fmtUSD(l.usd)}
              </p>
              {l.mode === "rent" && <p className="text-[11px] text-slate-400 font-sans">/month</p>}
            </div>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
            <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{l.compound} · {l.zone}</span>
          </p>
        </div>

        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-mono">
          <span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-amber-400" /> {l.beds} Beds</span>
          <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-amber-400" /> {l.bath} Baths</span>
          <span className="flex items-center gap-1.5"><Maximize className="h-3.5 w-3.5 text-amber-400" /> {fmtArea(l.area)}</span>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 truncate max-w-[140px]">Advisor: {l.agent}</span>
          <span className="font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            <span>Details</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

