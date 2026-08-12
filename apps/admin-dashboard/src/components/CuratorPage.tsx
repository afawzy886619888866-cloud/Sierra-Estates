import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, createSierraNotification } from '../firebase';
import { Listing } from '../types';

interface CuratorPageProps {
  T: (key: string) => string;
}

export default function CuratorPage({ T }: CuratorPageProps) {
  const [selectedCpd, setSelectedCpd] = useState('Mivida');
  const [priceAdj, setPriceAdj] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'listings'), (snap: any) => {
      const loaded: Listing[] = [];
      snap.forEach((doc: any) => {
        const d = doc.data();
        loaded.push({
          id: doc.id,
          code: d.code,
          cmp: d.cmp,
          type: d.type,
          beds: d.beds,
          area: d.area,
          price: d.price,
          ai: d.ai,
          status: d.status,
          img: d.img || 0,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(),
        });
      });
      setListings(loaded);
      setLoading(false);
    }, (err: any) => {
      handleFirestoreError(err, OperationType.LIST, 'listings');
    });

    return () => unsub();
  }, []);

  // Filter compounds list
  const compounds = useMemo(() => {
    return Array.from(new Set(listings.map((l: Listing) => l.cmp)));
  }, [listings]);

  // Compute stats for selected compound
  const cpdStats = useMemo(() => {
    const units = listings.filter((l: Listing) => l.cmp === selectedCpd);
    if (units.length === 0) return { avgPrice: 'EGP 0M', count: 0, aiScore: 0 };
    
    let sum = 0;
    let sumAi = 0;
    units.forEach((u: Listing) => {
      sum += parseFloat(u.price.replace(/[^\d.]/g, '')) || 0;
      sumAi += u.ai || 0;
    });

    return {
      avgPrice: `EGP ${(sum / units.length).toFixed(1)}M`,
      count: units.length,
      aiScore: (sumAi / units.length).toFixed(1)
    };
  }, [listings, selectedCpd]);

  // Sample adjusted price formula
  const getAdjustedPrice = (rawPriceStr: string) => {
    const rawVal = parseFloat(rawPriceStr.replace(/[^\d.]/g, '')) || 0;
    const isMillion = rawPriceStr.toUpperCase().includes('M');
    const adjustedVal = rawVal * (1 + priceAdj / 100);
    return `EGP ${adjustedVal.toFixed(1)}${isMillion ? 'M' : ''}`;
  };

  const handleApplyGlobalAdjustment = async () => {
    if (priceAdj === 0) return;
    if (!confirm(`Apply a global ${priceAdj > 0 ? '+' : ''}${priceAdj}% price model correction to ${selectedCpd}?`)) return;

    try {
      const batch = writeBatch(db);
      const targets = listings.filter((l: Listing) => l.cmp === selectedCpd);
      
      targets.forEach((t: Listing) => {
        const ref = doc(db, 'listings', t.id);
        batch.update(ref, {
          price: getAdjustedPrice(t.price),
          updatedAt: new Date()
        });
      });

      await batch.commit();
      
      await createSierraNotification(
        'listing',
        `AVM Index Correction: ${selectedCpd}`,
        `Applied global ${priceAdj > 0 ? '+' : ''}${priceAdj}% price correction adjustment to ${targets.length} compound listings.`,
        `تصحيح سعر السوق في كمبوند: ${selectedCpd}`,
        `تم تطبيق تعديل جماعي للأسعار بنسبة ${priceAdj > 0 ? '+' : ''}${priceAdj}% على ${targets.length} وحدة عقارية معروضة في الكمبوند.`
      );

      setPriceAdj(0);
      alert('AVM price modification rules synced successfully with Firestore!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/curate/${selectedCpd}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header drop list */}
      <div className="flex justify-between items-center gap-4 flex-wrap select-none text-slate-300">
        <h2 className="font-serif text-[15px] text-cyan-400 font-bold uppercase tracking-wide">
          {T('curator_title')}
        </h2>
        <div className="flex gap-2.5">
          <select
            value={selectedCpd}
            onChange={(e) => setSelectedCpd(e.target.value)}
            className="bg-[#0a0f1d] border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
          >
            {compounds.map((c) => (
              <option key={c} value={c} className="bg-[#0a0f1d] text-white">
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={handleApplyGlobalAdjustment}
            disabled={priceAdj === 0}
            className="px-4 py-1.5 text-xs bg-cyan-505 font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded select-none cursor-pointer disabled:opacity-40 disabled:scale-100 duration-100"
          >
            Deploy Pricing Sync
          </button>
        </div>
      </div>

      {/* Compound Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        {[
          { label: 'AVM Live Score', value: `${cpdStats.aiScore}/10`, color: '#34D399' },
          { label: 'Average Price', value: cpdStats.avgPrice, color: '#06b6d4' },
          { label: 'Registry Units', value: cpdStats.count.toString(), color: '#1E88D9' },
          { label: 'Market Growth', value: '+24%', color: '#7C3AED' },
          { label: 'Zone Region', value: '5th Settlement', color: '#E63946' },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
            style={{ borderTop: `2px solid ${item.color}` }}
          >
            <div className="text-sm font-mono font-bold text-white mb-1.5">{item.value}</div>
            <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider select-none">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slider Controls */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              🏷️ {T('avm')} · {T('priceAdj')} Slider
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-350 font-mono select-none">
              <span>{T('priceAdj')} model modifier</span>
              <span className={`font-bold ${priceAdj > 0 ? 'text-emerald-400' : priceAdj < 0 ? 'text-red-400' : ''}`}>
                {priceAdj > 0 ? '+' : ''}
                {priceAdj}%
              </span>
            </div>

            <div className="py-2">
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={priceAdj}
                onChange={(e) => setPriceAdj(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-2.5 uppercase select-none">
                <span>-20% Correction</span>
                <span>0% Zero-Correction</span>
                <span>+20% Appreciation</span>
              </div>
            </div>

            <div className="bg-[#0a0f1d] border border-slate-800 rounded p-3.5 leading-relaxed font-mono text-[11px] text-slate-300">
              <div className="text-slate-550 mb-1 uppercase text-[8px] select-none">AVM Multiplier projection:</div>
              <div className="text-cyan-400">
                EGP 5.8M Base →{' '}
                <span className="font-bold underline text-white">
                  {getAdjustedPrice('EGP 5.8M')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Score histogram */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              📊 {T('qualityScore')} Performance Distribution
            </span>
          </div>
          <div className="p-5 flex items-end gap-3 h-[130px] justify-between">
            {[
              { label: '90-100', val: 5, color: '#34D399' },
              { label: '80-90', val: 9, color: '#06b6d4' },
              { label: '70-80', val: 14, color: '#1E88D9' },
              { label: '60-70', val: 4, color: '#7C3AED' },
              { label: '<60', val: 1, color: '#E63946' },
            ].map((col, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full rounded-t-sm hover:brightness-105 transition duration-150 tooltip"
                  style={{
                    height: `${col.val * 6}%`,
                    background: `linear-gradient(to top, ${col.color}20, ${col.color})`
                  }}
                  title={`${col.label}: ${col.val} units`}
                />
                <span className="font-mono text-[8px] text-slate-500 uppercase select-none">{col.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
