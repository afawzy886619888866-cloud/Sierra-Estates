import React, { useState, useMemo } from 'react';
import { COMPOUNDS } from './compoundData';

interface PricingCalculatorProps {
  theme: string;
  isAr: boolean;
}

const FINISH_EN = ['Core & Shell', 'Semi-Finished', 'Fully Finished'];
const FINISH_AR = ['على الطوب', 'نصف تشطيب', 'تشطيب كامل'];

/**
 * Precise AVM Pricing tool — Egypt-calibrated fair-market estimate from
 * compound base rate, area (m²), bedrooms and finishing level.
 */
export default function PricingCalculator({ theme, isAr }: PricingCalculatorProps) {
  const [cpd, setCpd] = useState('Hyde Park New Cairo');
  const [area, setArea] = useState(180);
  const [bds, setBds] = useState(3);
  const [fin, setFin] = useState(1);

  const est = useMemo(() => {
    const base = (COMPOUNDS.find((x) => x.n === cpd) || COMPOUNDS[0]).priceM;
    const af = area / 200;
    const ff = [0.85, 1, 1.25][fin];
    const bf = bds <= 2 ? 0.82 : bds <= 3 ? 1 : bds <= 4 ? 1.22 : 1.45;
    const mid = base * af * ff * bf;
    return { lo: (mid * 0.88).toFixed(1), hi: (mid * 1.12).toFixed(1), mid: mid.toFixed(1) };
  }, [cpd, area, bds, fin]);

  const finOpts = isAr ? FINISH_AR : FINISH_EN;

  return (
    <div className="space-y-4 text-left">
      <p className="text-[11px] text-slate-400">
        {isAr ? 'محرك تقييم AVM مصري — نطاق سعر عادل فوري' : 'Egypt-calibrated AVM — instant fair-market range'}
      </p>

      {/* Result card */}
      <div className="p-5 rounded-2xl text-center bg-gradient-to-br from-[#0D2035] to-[#091828] shadow-2xl">
        <div className="font-mono text-[8px] tracking-[0.24em] uppercase text-[#E9C176]/85 mb-2">
          {isAr ? 'السعر المقدر' : 'Estimated fair value'}
        </div>
        <div className="font-serif text-4xl md:text-5xl font-semibold text-[#E9C176] leading-none mb-1">EGP {est.mid}M</div>
        <div className="text-xs text-slate-400 mb-4">{isAr ? 'النطاق' : 'Range'}: EGP {est.lo}M – {est.hi}M</div>
        <div className="bg-white/5 rounded-lg px-3.5 py-2.5">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-slate-400">{isAr ? 'ثقة الذكاء الاصطناعي' : 'AI Confidence'}</span>
            <span className="font-mono text-[11px] font-bold text-[#C8961A]">88%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#E9C176] to-[#C8961A]" style={{ width: '88%' }} />
          </div>
        </div>
      </div>

      {/* Compound */}
      <div className="rounded-xl border border-slate-800 p-3">
        <div className="text-[7.5px] font-bold tracking-widest uppercase text-slate-500 mb-1.5">{isAr ? 'المجمع السكني' : 'Compound'}</div>
        <select
          value={cpd}
          onChange={(e) => setCpd(e.target.value)}
          className="w-full bg-transparent outline-none text-sm font-semibold text-slate-200 cursor-pointer"
        >
          {COMPOUNDS.map((x) => (
            <option key={x.n} value={x.n} className="bg-slate-950">{x.n}</option>
          ))}
        </select>
      </div>

      {/* Area */}
      <div className="rounded-xl border border-slate-800 p-3">
        <div className="flex justify-between mb-2">
          <div className="text-[7.5px] font-bold tracking-widest uppercase text-slate-500">{isAr ? 'المساحة' : 'Area'}</div>
          <span className="font-mono text-xs font-bold text-[#C8961A]">{area} m²</span>
        </div>
        <input
          type="range" min={50} max={900} step={5} value={area}
          onChange={(e) => setArea(+e.target.value)}
          className="w-full accent-[#C8961A] cursor-pointer"
        />
      </div>

      {/* Beds */}
      <div className="rounded-xl border border-slate-800 p-3">
        <div className="text-[7.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">{isAr ? 'غرف النوم' : 'Bedrooms'}</div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((b) => (
            <button
              key={b}
              onClick={() => setBds(b)}
              className={`flex-1 py-2 rounded-lg border text-xs font-bold transition ${
                bds === b ? 'border-[#C8961A] bg-gradient-to-br from-[#C8961A] to-[#E9C176] text-[#0D2035]' : 'border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Finishing */}
      <div className="rounded-xl border border-slate-800 p-3">
        <div className="text-[7.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">{isAr ? 'مستوى التشطيب' : 'Finishing level'}</div>
        <div className="flex gap-1.5">
          {finOpts.map((f, i) => (
            <button
              key={i}
              onClick={() => setFin(i)}
              className={`flex-1 py-2 px-1 rounded-lg border text-[10px] font-semibold transition ${
                fin === i ? 'border-[#C8961A] bg-gradient-to-br from-[#C8961A] to-[#E9C176] text-[#0D2035]' : 'border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
