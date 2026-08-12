"use client";
import React, { useState } from 'react';

interface Commission {
  id: string;
  advisor: string;
  property: string;
  value: string;
  commission: string;
  status: 'pending' | 'authorized' | 'paid';
  date: string;
}

const INITIAL_COMMISSIONS: Commission[] = [
  {
    id: 'TX-901',
    advisor: 'A. Fawzy',
    property: 'Marassi Skyline Villa',
    value: '45,000,000 EGP',
    commission: '1,125,000 EGP',
    status: 'paid',
    date: '2026-03-28'
  },
  {
    id: 'TX-902',
    advisor: 'B. Mansour',
    property: 'New Capital Corporate Hub',
    value: '120,000,000 EGP',
    commission: '3,000,000 EGP',
    status: 'authorized',
    date: '2026-04-02'
  },
  {
    id: 'TX-903',
    advisor: 'S. El-Gammal',
    property: 'Hacienda Bay Retreat',
    value: '22,500,000 EGP',
    commission: '562,500 EGP',
    status: 'pending',
    date: '2026-04-05'
  }
];

export default function CommissionLedger() {
  const [commissions] = useState<Commission[]>(INITIAL_COMMISSIONS);

  return (
    <div className="commission-ledger animate-fade-in-up stagger-1">
      <div className="page-header mb-8">
        <h1 className="serif text-3xl mb-1 gold-underline">Commission Ledger</h1>
        <p className="page-sub">Executive financial reconciliation and advisor payout orchestration.</p>
      </div>

      <div className="kpi-grid mb-8">
        <div className="kpi-card cinematic-glow stagger-2">
          <div className="kpi-label">Aggregate GCI</div>
          <div className="kpi-value gold">EGP 4.68M</div>
          <div className="kpi-badge up">+12.4%</div>
        </div>
        <div className="kpi-card cinematic-glow stagger-3">
          <div className="kpi-label">Pending Payouts</div>
          <div className="kpi-value">EGP 562.5K</div>
          <div className="kpi-badge warn">OBLIGATION</div>
        </div>
        <div className="kpi-card cinematic-glow stagger-4">
          <div className="kpi-label">Authorized Flow</div>
          <div className="kpi-value gold">EGP 3.0M</div>
          <div className="kpi-badge blue">STAGED</div>
        </div>
        <div className="kpi-card cinematic-glow stagger-4">
          <div className="kpi-label">Yield Efficiency</div>
          <div className="kpi-value">98.2%</div>
          <div className="kpi-badge blue">OPTIMAL</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card glass-panel relative overflow-hidden">
           <div className="card-header border-white/5 bg-navy/20">
              <h2 className="serif text-xl">Transaction Reconciliation</h2>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm">Export Ledger</button>
                <button className="btn btn-gold btn-sm">Authorize All</button>
              </div>
           </div>

           <div className="table-wrap p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-secondary font-bold">
                    <th className="px-6 py-4 text-left">Transaction ID</th>
                    <th className="px-6 py-4 text-left">Strategic Advisor</th>
                    <th className="px-6 py-4 text-left">Portfolio Asset</th>
                    <th className="px-6 py-4 text-right">Asset Value</th>
                    <th className="px-6 py-4 text-right">Commission</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Maturity Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {commissions.map((comm, index) => (
                    <tr key={comm.id} className={`hover:bg-white/5 transition-colors animate-fade-in-up stagger-${(index % 4) + 1}`}>
                      <td className="px-6 py-4 font-mono text-[11px] text-gold">{comm.id}</td>
                      <td className="px-6 py-4 font-bold text-sm">{comm.advisor}</td>
                      <td className="px-6 py-4 text-sm text-secondary">{comm.property}</td>
                      <td className="px-6 py-4 text-right text-xs font-medium">{comm.value}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-white">{comm.commission}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`badge ${
                          comm.status === 'paid' ? 'badge-success' : 
                          comm.status === 'authorized' ? 'badge-blue' : 'badge-warning'
                        } uppercase tracking-tighter text-[9px]`}>
                          {comm.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-secondary">{comm.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>

        <div className="space-y-8">
          <div className="card glass-panel p-6 border-gold/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3 className="serif text-lg mb-4 text-gold flex items-center gap-2">
              Commission Protocols
            </h3>
            <div className="space-y-4">
              <div className="rule-item">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Base Remuneration</span>
                  <span className="text-white font-bold text-xs font-mono">EGP 2,000</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed italic">Standard remote operational stipend.</p>
              </div>
              
              <div className="rule-item pt-3 border-t border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Achievement Bonus</span>
                  <span className="text-gold font-bold text-xs font-mono">EGP 4,000 Total</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">Unlocked upon 1 closure (Net Commission ≥ 25K).</p>
              </div>

              <div className="rule-item pt-3 border-t border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Incentive Tiers</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white/5 p-2 rounded border border-white/5">
                    <div className="text-gold font-bold text-xs">20% - 25%</div>
                    <div className="text-[8px] uppercase tracking-tighter text-secondary">Private Effort</div>
                  </div>
                  <div className="bg-white/5 p-2 rounded border border-white/5">
                    <div className="text-blue font-bold text-xs">10% - 15%</div>
                    <div className="text-[8px] uppercase tracking-tighter text-secondary">Company Stock</div>
                  </div>
                </div>
              </div>

              <div className="rule-item pt-3 border-t border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Ad Source Amplifiers</span>
                </div>
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue"></div>
                    <span className="text-[10px] text-white/70">Facebook: <b className="text-blue">+15%</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>
                    <span className="text-[10px] text-white/70">PF Gateway: <b className="text-gold">+5%</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card glass-panel p-6">
            <h3 className="serif text-lg mb-4 flex items-center gap-2">
              Operational SOPs
            </h3>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <div className="w-1 h-1 rounded-full bg-gold mt-1.5 shrink-0"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-white/90 uppercase tracking-wide">Operational Window</div>
                  <div className="text-[11px] text-secondary">11:00 AM — 07:00 PM (GMT+2)</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-1 h-1 rounded-full bg-gold mt-1.5 shrink-0"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-white/90 uppercase tracking-wide">Listing Protocol</div>
                  <div className="text-[11px] text-secondary">10-15 Multi-angle natural light captures.</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-1 h-1 rounded-full bg-gold mt-1.5 shrink-0"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-white/90 uppercase tracking-wide">Intellectual Assets</div>
                  <div className="text-[11px] text-secondary">Strict confidentiality on stakeholder data.</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="two-col-equal mt-8">
         <div className="card glass-panel p-6">
            <h3 className="serif text-lg mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold shadow-gold"></span>
              Advisor Performance Metrics
            </h3>
            <div className="chart-placeholder h-[180px] border border-white/5 rounded-xl bg-white/2 flex items-end p-4 gap-4">
               {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                 <div key={i} className="flex-1 bg-gradient-to-t from-gold/40 to-gold rounded-t shadow-gold/20" style={{ height: `${h}%` }}></div>
               ))}
            </div>
            <div className="flex justify-between mt-4 text-[9px] uppercase tracking-widest text-secondary font-bold">
              <span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
            </div>
         </div>

         <div className="card glass-panel p-6">
            <h3 className="serif text-lg mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue shadow-blue"></span>
              Strategic Yield Forecast
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-gold/30 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-secondary font-bold uppercase tracking-widest">Target Asset Velocity</span>
                    <span className="text-gold font-bold">EGP 12.8M</span>
                 </div>
                 <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gold w-3/4 rounded-full shadow-gold"></div>
                 </div>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-blue/30 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-secondary font-bold uppercase tracking-widest">Yield Variance (A/B)</span>
                    <span className="text-blue font-bold">+18.5%</span>
                 </div>
                 <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue w-1/2 rounded-full shadow-blue"></div>
                 </div>
              </div>
              <div className="p-4 rounded-lg bg-white/2 border border-dashed border-white/10 text-center">
                <span className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Next Audit Cycle: May 01, 2026</span>
              </div>
            </div>
         </div>
      </div>

    </div>
  );
}
