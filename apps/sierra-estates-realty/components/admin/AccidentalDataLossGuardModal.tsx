'use client';

import React, { useState, useEffect } from 'react';

export interface AccidentalDataLossGuardProps {
  isOpen: boolean;
  title: { en: string; ar: string };
  actionDescription: { en: string; ar: string };
  impactSummary: { en: string; ar: string };
  affectedCount?: number;
  isDestructive?: boolean;
  requiredConfirmationWord?: string;
  lang?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AccidentalDataLossGuardModal({
  isOpen,
  title,
  actionDescription,
  impactSummary,
  affectedCount,
  isDestructive = true,
  requiredConfirmationWord = 'CONFIRM',
  lang = 'en',
  onConfirm,
  onCancel,
}: AccidentalDataLossGuardProps) {
  const [inputWord, setInputWord] = useState('');
  const [countdown, setCountdown] = useState(5);
  const isAr = lang === 'ar';

  useEffect(() => {
    if (isOpen) {
      setInputWord('');
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = inputWord.trim().toUpperCase() === requiredConfirmationWord.toUpperCase() && countdown === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-lg p-6 bg-slate-900 border ${
          isDestructive ? 'border-red-500/50' : 'border-amber-500/50'
        } rounded-2xl shadow-2xl space-y-5 text-slate-100`}
      >
        {/* Header with Hazard Indicator */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl ${
              isDestructive
                ? 'bg-red-950/80 border-red-500/60 text-red-400'
                : 'bg-amber-950/80 border-amber-500/60 text-amber-400'
            } border flex items-center justify-center text-2xl shrink-0`}
          >
            ⚠️
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 uppercase tracking-wider font-bold">
                {isAr ? 'حاجز الحماية من الفقد العرضي للبيانات' : 'Data Loss Prevention Shield'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {isAr ? title.ar : title.en}
            </h3>
          </div>
        </div>

        {/* Warning Content */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 text-xs leading-relaxed">
          <div className="text-slate-300">
            <strong className="text-red-400 font-semibold">{isAr ? 'العملية المطلوبة: ' : 'Requested Action: '}</strong>
            {isAr ? actionDescription.ar : actionDescription.en}
          </div>

          <div className="text-slate-400">
            <strong className="text-amber-400 font-semibold">{isAr ? 'الأثر التشغيلي: ' : 'Operational Impact: '}</strong>
            {isAr ? impactSummary.ar : impactSummary.en}
          </div>

          {affectedCount !== undefined && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-400">{isAr ? 'عدد السجلات المتأثرة:' : 'Affected Records:'}</span>
              <span className="text-red-400 font-bold">{affectedCount.toLocaleString()} {isAr ? 'سجل' : 'rows'}</span>
            </div>
          )}
        </div>

        {/* Safeguard Verification Input */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            {isAr ? (
              <>لتأكيد العملية، يرجى كتابة <span className="font-mono text-red-400 font-bold">{requiredConfirmationWord}</span> في الحقل أدناه:</>
            ) : (
              <>To confirm, please type <span className="font-mono text-red-400 font-bold">{requiredConfirmationWord}</span> below:</>
            )}
          </label>
          <input
            type="text"
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            placeholder={requiredConfirmationWord}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl font-mono text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
            autoFocus
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={!isConfirmed}
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              isConfirmed
                ? isDestructive
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/50'
                : 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <span>{isAr ? 'تأكيد وحذف' : 'Confirm & Execute'}</span>
            {countdown > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-black/40 rounded text-slate-400">
                {countdown}s
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
