'use client';

import React, { useState, useEffect } from 'react';
import { FxGoldValuationEngine, DEFAULT_FX_RATES, MultiCurrencyValuation } from '@sierra-estates/agents-core/src/fx-gold-engine';

export type SupportedCurrency = 'EGP' | 'USD' | 'AED' | 'SAR' | 'GOLD_21K' | 'GOLD_SOVEREIGN';

interface CurrencyGoldSelectorProps {
  basePriceEGP: number;
  className?: string;
  onCurrencyChange?: (currency: SupportedCurrency) => void;
}

export function CurrencyGoldSelector({ basePriceEGP, className = '', onCurrencyChange }: CurrencyGoldSelectorProps) {
  const [currency, setCurrency] = useState<SupportedCurrency>('EGP');
  const [valuation, setValuation] = useState<MultiCurrencyValuation>(() =>
    FxGoldValuationEngine.calculateParity(basePriceEGP, DEFAULT_FX_RATES)
  );

  useEffect(() => {
    setValuation(FxGoldValuationEngine.calculateParity(basePriceEGP, DEFAULT_FX_RATES));
  }, [basePriceEGP]);

  const handleSelect = (c: SupportedCurrency) => {
    setCurrency(c);
    onCurrencyChange?.(c);
  };

  const renderDisplay = () => {
    switch (currency) {
      case 'USD':
        return `$${valuation.usdEquivalent.toLocaleString()} USD`;
      case 'AED':
        return `${valuation.aedEquivalent.toLocaleString()} AED`;
      case 'SAR':
        return `${valuation.sarEquivalent.toLocaleString()} SAR`;
      case 'GOLD_21K':
        return `${valuation.formattedDisplay.gold21k} (21K Gold)`;
      case 'GOLD_SOVEREIGN':
        return `${valuation.formattedDisplay.goldSovereign}`;
      case 'EGP':
      default:
        return `${basePriceEGP.toLocaleString()} EGP`;
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-bold text-amber-400 tracking-tight">
          {renderDisplay()}
        </span>
      </div>
      <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5 backdrop-blur-md">
        {(['EGP', 'USD', 'AED', 'GOLD_21K', 'GOLD_SOVEREIGN'] as SupportedCurrency[]).map((c) => (
          <button
            key={c}
            onClick={() => handleSelect(c)}
            type="button"
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
              currency === c
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            {c === 'GOLD_21K' ? '21K Gold' : c === 'GOLD_SOVEREIGN' ? 'جنيه ذهب' : c}
          </button>
        ))}
      </div>
    </div>
  );
}
