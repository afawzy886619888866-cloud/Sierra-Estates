import React, { useState, useMemo } from 'react';
import { COMPOUNDS } from './compoundData';

interface ROICalculatorProps {
  theme: string;
  isAr: boolean;
}

/**
 * ROI Analysis / Yield Calculator.
 * Yield leaderboard (from reference compound data) + an interactive
 * gross/net yield, 5yr appreciation and annual cash calculator.
 */
export default function ROICalculator({ theme, isAr }: ROICalculatorProps) {
  const [price, setPrice] = useState(6); // EGP millions
  const [rent, setRent] = useState(6000); // USD / month

  const gross = ((rent * 12) / (price * 1e6) * 100).toFixed(2);
  const net = (parseFloat(gross) * 0.75).toFixed(2);
  const gain5 = (price * 1.2).toFixed(1);
  const cash = Math.round(rent * 12 * 0.75).toLocaleString();

  const sorted = useMemo(
    () => COMPOUNDS.slice().sort((a, b) => parseFloat(b.g) - parseFloat(a.g)).slice(0, 10),
    []
  );

  const light = theme === 'light';

  return (
    <div className="space-y-6 text-left">
      {/* Yield Leaderboard */}
      <div>
        <h4 className="font-serif text-lg font-medium text-white mb-3">
          {isAr ? 'ترتيب العوائد' : 'Yield Leaderboard'}
        </h4>
        <div className={`rounded-xl overflow-hidden border ${light ? 'border-[#C8961A]/15 bg-white' : 'border-slate-800 bg-slate-950'}`}>
          {sorted.map((cpd, i) => {
            const pct = parseFloat(cpd.g);
            const barW = Math.round((pct / 35) * 100);
            return (
              <div
                key={cpd.n}
                className={`grid items-center gap-2 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-800/50' : ''} ${i === 0 ? 'bg-[#C8961A]/5' : ''}`}
                style={{ gridTemplateColumns: '22px 1fr 52px' }}
              >
                <span className={`font-mono text-[10px] font-bold ${i < 3 ? 'text-[#C8961A]' : 'text-slate-500'}`}>#{i + 1}</span>
                <div>
                  <div className="text-[11.5px] font-semibold text-slate-200 mb-1 truncate">{cpd.n}</div>
                  <div className="h-[5px] rounded-full bg-slate-800/60 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#E9C176] to-[#C8961A]" style={{ width: `${barW}%` }} />
                  </div>
                </div>
                <span className="font-mono text-[13px] font-bold text-[#C8961A] text-right">{cpd.g}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Yield Calculator */}
      <div className="p-4 rounded-2xl bg-[#0D2035] shadow-2xl">
        <h4 className="font-serif text-lg font-medium text-white mb-4">
          {isAr ? 'حاسبة العائد' : 'Yield Calculator'}
        </h4>

        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{isAr ? 'سعر الشراء' : 'Purchase price'}</span>
            <span className="font-mono text-xs font-bold text-[#C8961A]">EGP {price.toFixed(1)}M</span>
          </div>
          <input
            type="range" min={1} max={50} step={0.5} value={price}
            onChange={(e) => setPrice(+e.target.value)}
            className="w-full accent-[#C8961A] cursor-pointer"
          />
        </div>

        <div className="mb-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{isAr ? 'الإيجار الشهري' : 'Monthly rent'}/mo</span>
            <span className="font-mono text-xs font-bold text-[#C8961A]">${rent.toLocaleString()}</span>
          </div>
          <input
            type="range" min={500} max={15000} step={100} value={rent}
            onChange={(e) => setRent(+e.target.value)}
            className="w-full accent-[#C8961A] cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            [`${gross}%`, isAr ? 'العائد الإجمالي' : 'Gross Yield'],
            [`${net}%`, isAr ? 'العائد الصافي' : 'Net Yield'],
            [`EGP ${gain5}M`, isAr ? 'ارتفاع 5 سنوات' : '5yr Appreciation'],
            [`$${cash}`, isAr ? 'نقد سنوي' : 'Annual Cash'],
          ].map((pair, i) => (
            <div key={i} className="rounded-xl bg-white/5 p-3 text-center">
              <div className="font-mono text-lg font-bold text-[#C8961A] leading-none">{pair[0]}</div>
              <div className="text-[8px] uppercase tracking-wider text-slate-400 mt-1.5">{pair[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
