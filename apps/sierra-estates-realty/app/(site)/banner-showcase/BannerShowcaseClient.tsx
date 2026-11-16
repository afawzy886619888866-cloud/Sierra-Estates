'use client';

import React from 'react';
import SiteShell from '@/components/site/SiteShell';
import UnifiedBilingualHeroBanner, { UNIFIED_BANNER_CONTENT } from '@/components/site/UnifiedBilingualHeroBanner';
import { Sparkles, CheckCircle2 } from 'lucide-react';


export default function BannerShowcaseClient() {
  const content = UNIFIED_BANNER_CONTENT;

  return (
    <SiteShell>
      <div className="min-h-screen bg-[#060a12] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c8961a]/15 border border-[#c8961a]/30 text-[#f5d78e] text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Sierra Estates Brand Architecture
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-light tracking-tight text-white">
              Unified Bilingual Hero Banner
            </h1>
            <p className="text-sm md:text-base text-gray-400 font-light leading-relaxed">
              Official bilingual copy matrix, side-by-side verification, and multi-channel sizing formats 
              (Hero Web Banner, Mobile/Stories 9:16, Large Outdoor Highway Billboard).
            </p>
          </div>

          {/* Master Interactive Banner Component */}
          <UnifiedBilingualHeroBanner initialFormat="desktop" initialMode="side-by-side" />

          {/* Content Specifications Matrix Table */}
          <div className="mt-16 rounded-3xl bg-[#09111c] border border-white/10 p-6 md:p-10 shadow-2xl space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <h3 className="text-xl font-serif text-white font-medium">
                  Unified Bilingual Copy Specification Matrix
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Single source of truth for engineering, marketing, and outdoor advertising assets.
                </p>
              </div>
              <span className="text-xs font-mono text-[#c8961a] bg-[#c8961a]/10 border border-[#c8961a]/20 px-3 py-1 rounded-lg">
                Status: Production Verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/3 text-xs uppercase text-[#c8961a] border-b border-white/10">
                  <tr>
                    <th className="py-4 px-6 font-semibold w-1/5">Element</th>
                    <th className="py-4 px-6 font-semibold w-2/5">English Version</th>
                    <th className="py-4 px-6 font-semibold w-2/5 text-right font-serif">النسخة العربية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-light">
                  {/* Headline */}
                  <tr className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-[#e9c176] font-medium">Headline</td>
                    <td className="py-4 px-6 font-medium text-white">{content.en.headline}</td>
                    <td className="py-4 px-6 text-right font-medium text-white font-serif text-base" dir="rtl">{content.ar.headline}</td>
                  </tr>

                  {/* Subhead */}
                  <tr className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-[#e9c176] font-medium">Subhead</td>
                    <td className="py-4 px-6 leading-relaxed text-gray-300">{content.en.subhead}</td>
                    <td className="py-4 px-6 text-right leading-relaxed text-gray-300 font-serif text-base" dir="rtl">{content.ar.subhead}</td>
                  </tr>

                  {/* Body / Punchline */}
                  <tr className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-[#e9c176] font-medium">Body / Punchline</td>
                    <td className="py-4 px-6 leading-relaxed text-gray-400">{content.en.body}</td>
                    <td className="py-4 px-6 text-right leading-relaxed text-gray-400 font-serif text-base" dir="rtl">{content.ar.body}</td>
                  </tr>

                  {/* Badges */}
                  <tr className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-[#e9c176] font-medium">Badges / Highlights</td>
                    <td className="py-4 px-6">
                      <ul className="space-y-1.5">
                        {content.en.badges.map((b, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#c8961a]" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-4 px-6 text-right" dir="rtl">
                      <ul className="space-y-1.5">
                        {content.ar.badges.map((b, i) => (
                          <li key={i} className="flex items-center justify-end gap-2 text-xs text-gray-300 font-serif">
                            <span>{b}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#c8961a]" />
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sizing Layout Formats Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#09111c] border border-white/10 space-y-4">
              <div className="text-[#c8961a] font-mono text-xs uppercase tracking-wider">Format 01</div>
              <h4 className="text-lg font-bold text-white">Hero Web Banner</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Optimized for desktop headers, interactive landing portals, and responsive widescreen displays.
              </p>
              <div className="pt-4 border-t border-white/10 text-[11px] space-y-2 text-gray-300">
                <div><span className="text-gray-500">Top Banner:</span> {content.en.desktop.top}</div>
                <div><span className="text-gray-500">Footer Strip:</span> {content.en.desktop.footer}</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#09111c] border border-white/10 space-y-4">
              <div className="text-[#c8961a] font-mono text-xs uppercase tracking-wider">Format 02</div>
              <h4 className="text-lg font-bold text-white">Mobile & Stories</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Condensed high-impact punchlines for 9:16 Instagram/Snapchat stories, app splash screens, and reels.
              </p>
              <div className="pt-4 border-t border-white/10 text-[11px] space-y-2 text-gray-300">
                <div><span className="text-gray-500">Header:</span> {content.en.mobile.header}</div>
                <div><span className="text-gray-500">Tag:</span> {content.en.mobile.tag}</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#09111c] border border-white/10 space-y-4">
              <div className="text-[#c8961a] font-mono text-xs uppercase tracking-wider">Format 03</div>
              <h4 className="text-lg font-bold text-white">Outdoor / Billboard</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ultra-high-visibility typography engineered for Ring Road and 90th Street highway billboards.
              </p>
              <div className="pt-4 border-t border-white/10 text-[11px] space-y-2 text-gray-300">
                <div><span className="text-gray-500">Primary:</span> {content.en.billboard.primary}</div>
                <div><span className="text-gray-500">Tagline:</span> {content.en.billboard.tagline}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
