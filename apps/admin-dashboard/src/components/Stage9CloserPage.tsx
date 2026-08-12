import React, { useState } from 'react';

interface Deal {
  id: string;
  client: string;
  phone: string;
  prop: string;
  value: string;
  stage: 'initial' | 'negotiation' | 'contract' | 'closed';
  prog: number;
  signed: boolean;
  deposit: boolean;
  c: string;
}

const DEALS_LIST: Deal[] = [
  { id: 'DL-0097', client: 'Ahmed Al-Rashid', phone: '+20 100 111 2233', prop: 'Villa Hyde Park · 5 Beds · 420m²', value: 'EGP 35M', stage: 'contract', prog: 85, signed: false, deposit: true, c: '#C8961A' },
  { id: 'DL-0096', client: 'Khalid Mansour', phone: '+971 50 333 4455', prop: 'Penthouse Uptown · 4 Beds · 320m²', value: 'EGP 28M', stage: 'negotiation', prog: 60, signed: false, deposit: false, c: '#1E88D9' },
  { id: 'DL-0095', client: 'Omar Farouk', phone: '+20 100 555 6677', prop: 'Twin House Mountain View · 4 Beds', value: 'EGP 22M', stage: 'contract', prog: 72, signed: true, deposit: true, c: '#34D399' },
  { id: 'DL-0094', client: 'Rania Nasser', phone: '+20 102 777 8899', prop: 'Villa Villette · 5 Beds · 380m²', value: 'EGP 31M', stage: 'closed', prog: 100, signed: true, deposit: true, c: '#7C3AED' },
  { id: 'DL-0093', client: 'Hisham Bakr', phone: '+20 109 888 9900', prop: 'Garden Villa Mivida · 3 Beds · 195m²', value: 'EGP 8.5M', stage: 'initial', prog: 25, signed: false, deposit: false, c: '#E63946' },
  { id: 'DL-0092', client: 'Layla Karim', phone: '+20 109 666 7788', prop: 'Apartment Eastown · 3 Beds · 155m²', value: 'EGP 7.2M', stage: 'negotiation', prog: 50, signed: false, deposit: false, c: '#f59e0b' },
];

export default function Stage9CloserPage() {
  const [stageF, setStageF] = useState<string>('all');
  const [deals, setDeals] = useState<Deal[]>(DEALS_LIST);

  const STAGES = [
    { id: 'all', lbl: 'All Deals', c: '' },
    { id: 'initial', lbl: 'Initial Contact', c: '#E63946' },
    { id: 'negotiation', lbl: 'Negotiation', c: '#f59e0b' },
    { id: 'contract', lbl: 'Contract Draft', c: '#1E88D9' },
    { id: 'closed', lbl: 'Closed ✓', c: '#34D399' },
  ];

  const filteredDeals = stageF === 'all' ? deals : deals.filter((d) => d.stage === stageF);
  const totalPipelineVal = deals.reduce((sum, d) => sum + parseFloat(d.value.replace(/[^\d.]/g, '')), 0);

  const handleToggleDocuSign = (id: string) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, signed: !d.signed, prog: d.signed ? d.prog - 10 : d.prog + 10 } : d))
    );
  };

  const handleToggleStripe = (id: string) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, deposit: !d.deposit, prog: d.deposit ? d.prog - 15 : d.prog + 15 } : d))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
        {STAGES.slice(1).map((s) => (
          <div
            key={s.id}
            className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
            style={{ borderTop: `2px solid ${s.c}` }}
          >
            <div className="text-xl font-mono font-bold text-white pr-2 text-left">{deals.filter((d) => d.stage === s.id).length}</div>
            <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-2.5">
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Summary Bar */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-xl">
        <div className="shrink-0 select-none">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">
            Total Pipeline Capital
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            EGP {totalPipelineVal.toFixed(1)}M
          </div>
        </div>

        {/* Proportional visual distribution */}
        <div className="flex-1 w-full flex h-2 rounded-full overflow-hidden bg-slate-850 relative">
          {deals.map((d) => {
            const val = parseFloat(d.value.replace(/[^\d.]/g, '')) || 5;
            const pct = (val / totalPipelineVal) * 100;
            return (
              <div
                key={d.id}
                className="h-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: d.c }}
                title={`${d.client}: ${d.value}`}
              />
            );
          })}
        </div>

        <button className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded font-bold text-xs select-none transition duration-150 active:scale-95 cursor-pointer">
          ＋ Register Deal
        </button>
      </div>

      {/* Stage Pills filter */}
      <div className="flex gap-2 flex-wrap items-center select-none">
        {STAGES.map((s) => {
          const isSelected = stageF === s.id;
          const count = s.id === 'all' ? deals.length : deals.filter((d) => d.stage === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => setStageF(s.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition duration-150 flex items-center gap-1.5 cursor-pointer hover:bg-white/10 ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-[#0a0f1d] text-slate-400 border-slate-800'
              }`}
            >
              <span>{s.lbl}</span>
              <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded-full text-white/50">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Deals scroll log */}
      <div className="space-y-4">
        {filteredDeals.map((deal) => (
          <div
            key={deal.id}
            className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl"
            style={{ borderLeft: `3px solid ${deal.c}` }}
          >
            <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 shrink-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base select-none shadow shrink-0"
                  style={{ backgroundColor: `${deal.c}20`, border: `1.5px solid ${deal.c}`, color: deal.c }}
                >
                  {deal.client[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white transition duration-150 truncate">
                    {deal.client}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{deal.prop}</div>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="flex-1 max-w-sm w-full md:mx-4">
                <div className="flex justify-between font-mono text-[9px] text-slate-500 uppercase mb-1 select-none">
                  <span>Realtor Closer Progress</span>
                  <span>{deal.prog}% Complete</span>
                </div>
                <div className="w-full bg-slate-850 h-[4px] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${deal.prog}%`, backgroundColor: deal.c }}
                  />
                </div>
              </div>

              <div className="flex flex-col md:items-end justify-center font-mono shrink-0 select-text">
                <div className="text-base font-bold text-white">{deal.value}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">{deal.id}</div>
              </div>
            </div>

            {/* Bottom pills & interactions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex flex-wrap gap-2 items-center">
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                deal.stage === 'closed'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : deal.stage === 'contract'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {deal.stage}
              </span>

              <button
                onClick={() => handleToggleDocuSign(deal.id)}
                className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition hover:brightness-105 shrink-0 cursor-pointer ${
                  deal.signed
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800'
                }`}
              >
                {deal.signed ? '✓ DocuSign signed' : '⚠️ Pending DocuSign'}
              </button>

              <button
                onClick={() => handleToggleStripe(deal.id)}
                className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition hover:brightness-105 shrink-0 cursor-pointer ${
                  deal.deposit
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800'
                }`}
              >
                {deal.deposit ? '✓ Stripe Escrow Paid' : '⚠️ Stripe Pending'}
              </button>

              <div className="md:ml-auto flex gap-1.5 shrink-0">
                <a
                  href={`https://wa.me/${deal.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  className="px-2.5 py-1 text-[9.5px] font-mono hover:bg-white/5 text-emerald-400 border border-slate-800 hover:border-emerald-500/30 rounded transition"
                  id={`btn-talk-broker-${deal.id}`}
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
