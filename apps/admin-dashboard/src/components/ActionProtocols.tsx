"use client";
import React, { useState } from 'react';

interface Protocol {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'active' | 'completed';
  deadline: string;
}

const INITIAL_PROTOCOLS: Protocol[] = [
  {
    id: '1',
    title: 'Executive Portfolio Audit',
    description: 'Review high-net-worth assets in the Marassi corridor for Q3 rebalancing.',
    priority: 'high',
    status: 'active',
    deadline: '2026-04-10'
  },
  {
    id: '2',
    title: 'Property Finder Integration Sync',
    description: 'Validate listing synchronization with the Enterprise Gateway.',
    priority: 'high',
    status: 'pending',
    deadline: '2026-04-12'
  },
  {
    id: '3',
    title: 'Investor Dinner Prep',
    description: 'Arrange presentation materials for the New Capital developments briefing.',
    priority: 'medium',
    status: 'pending',
    deadline: '2026-04-15'
  }
];

export default function ActionProtocols() {
  const [protocols, setProtocols] = useState<Protocol[]>(INITIAL_PROTOCOLS);

  const executeProtocol = (id: string) => {
    setProtocols(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p));
  };

  return (
    <div className="protocols-screen animate-fade-in-up stagger-1">
      <div className="page-header mb-8">
        <h1 className="serif text-3xl mb-1 gold-underline">Action Protocols</h1>
        <p className="page-sub">Mission-critical task management and strategic focal points.</p>
      </div>

      <div className="kpi-grid mb-8">
        <div className="kpi-card cinematic-glow stagger-2">
          <div className="kpi-label">Active Protocols</div>
          <div className="kpi-value gold">{protocols.filter(p => p.status === 'active').length}</div>
          <div className="kpi-badge up">TACTICAL</div>
        </div>
        <div className="kpi-card cinematic-glow stagger-3">
          <div className="kpi-label">Pending Sync</div>
          <div className="kpi-value">{protocols.filter(p => p.status === 'pending').length}</div>
          <div className="kpi-badge warn">QUEUE</div>
        </div>
        <div className="kpi-card cinematic-glow stagger-4">
          <div className="kpi-label">Completed Cycles</div>
          <div className="kpi-value gold">{protocols.filter(p => p.status === 'completed').length}</div>
          <div className="kpi-badge blue">STABLE</div>
        </div>
        <div className="kpi-card cinematic-glow stagger-4">
          <div className="kpi-label">Priority Load</div>
          <div className="kpi-value">
            {Math.round((protocols.filter(p => p.priority === 'high').length / protocols.length) * 100)}%
          </div>
          <div className="kpi-badge blue">LOAD</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="card glass-panel relative overflow-hidden stagger-2">
            <div className="card-header border-b border-white/5 bg-navy/20">
              <h2 className="serif text-xl">Tactical Mission Queue</h2>
              <button className="btn btn-gold btn-sm">+ New Protocol</button>
            </div>

            <div className="card-body p-6 space-y-4">
              {protocols.map((protocol, index) => (
                <div 
                  key={protocol.id} 
                  className={`protocol-item p-5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 animate-fade-in-up stagger-${(index % 4) + 1}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-4">
                      <div className={`pulse-dot ${protocol.status}`}></div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{protocol.title}</h3>
                        <div className="text-[10px] uppercase tracking-widest text-gold/60 mt-1">ID: PRT-{protocol.id}09-X</div>
                      </div>
                    </div>
                    <div className={`badge ${
                      protocol.priority === 'high' ? 'badge-error' : 
                      protocol.priority === 'medium' ? 'badge-warning' : 'badge-navy'
                    } uppercase tracking-tighter text-[9px] py-0.5 px-2`}>
                      {protocol.priority} priority
                    </div>
                  </div>
                  
                  <p className="text-sm text-secondary/80 mb-5 leading-relaxed max-w-2xl">{protocol.description}</p>
                  
                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <div className="flex items-center gap-6">
                      <div className="text-[10px] text-secondary/60">
                        <span className="block opacity-50 uppercase mb-0.5">Deadline</span>
                        <span className="font-semibold text-white/80">{protocol.deadline}</span>
                      </div>
                      <div className="text-[10px] text-secondary/60">
                        <span className="block opacity-50 uppercase mb-0.5">Assigned To</span>
                        <span className="font-semibold text-white/80">Command Central</span>
                      </div>
                    </div>
                    
                    {protocol.status !== 'completed' ? (
                      <button 
                        onClick={() => executeProtocol(protocol.id)}
                        className="btn btn-ghost btn-sm text-gold hover:text-white group"
                      >
                        Authorize Execution <span className="group-hover:translate-x-1 transition-transform inline-block">›</span>
                      </button>
                    ) : (
                      <div className="badge badge-success border border-success/30 bg-success/5 font-bold italic tracking-widest text-[10px] px-3 py-1">
                        PROTOCOL SECURED
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="card glass-panel p-6 border-blue/20">
            <h3 className="serif text-lg mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue animate-pulse"></span>
              Daily Operational Pulse
            </h3>
            <div className="space-y-5">
              <div className="sop-task-item p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">Morning Briefing</span>
                  <span className="text-[9px] text-secondary">11:00 AM — DAILY</span>
                </div>
                <div className="text-xs text-secondary mb-3">Review high-priority sales requests from the Strategic Advisor network.</div>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue w-full"></div>
                  </div>
                  <span className="text-[9px] font-bold text-blue">AUDITED</span>
                </div>
              </div>

              <div className="sop-task-item p-4 rounded-xl bg-white/5 border border-white/5 hover:border-gold/30 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">Options Packaging</span>
                  <span className="text-[9px] text-secondary">PENDING</span>
                </div>
                <div className="text-xs text-secondary mb-3">Construct curated "Options Packages" (3-5 high-fidelity units) for investor leads.</div>
                <button className="btn btn-gold btn-xs w-full py-1.5 opacity-80 hover:opacity-100">Initialize Packaging</button>
              </div>

              <div className="sop-task-item p-4 rounded-xl bg-navy/40 border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">Direct Acquisition</span>
                </div>
                <div className="text-[11px] text-secondary leading-tight italic">Priority Focus: 21 Core Compounds of New Cairo and The Fifth Settlement.</div>
              </div>
            </div>
          </div>

          <div className="card glass-panel p-6">
            <h3 className="serif text-lg mb-4">Strategic Timeline</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-[1px] bg-white/10 relative">
                  <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-gold"></div>
                </div>
                <div className="pb-4">
                  <div className="text-[10px] text-gold font-bold uppercase tracking-widest mb-1">Today</div>
                  <div className="text-xs text-white/70">PF Enterprise Gateway Audit</div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-[1px] bg-white/10 relative">
                  <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-white/20"></div>
                </div>
                <div className="pb-4">
                  <div className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">Apr 08</div>
                  <div className="text-xs text-white/40">Marassi VR Experience Phase II</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pulse-dot { width: 10px; height: 10px; border-radius: 50%; position: relative; }
        .pulse-dot::after {
          content: ''; position: absolute; inset: -3px; 
          border-radius: 50%; border: 1px solid currentColor;
          opacity: 0;
        }

        .pulse-dot.active { 
          background: #C8A96E; color: #C8A96E; box-shadow: 0 0 10px #C8A96E; 
        }
        .pulse-dot.active::after {
          animation: ripple 2s infinite ease-out; opacity: 1;
        }

        .pulse-dot.pending { background: #6B7280; color: #6B7280; }
        .pulse-dot.completed { background: #10B981; color: #10B981; box-shadow: 0 0 8px #10B981; }

        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

