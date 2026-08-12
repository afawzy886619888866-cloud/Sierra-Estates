import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Agent } from '../types';

// Deterministic 30-day deal metrics resolver for agents (matches AgentsPage)
const getDeals30DaysForAgent = (agentId: string, agentName: string): number => {
  const name = agentName.toLowerCase();
  // Using same logic from AgentsPage for consistency
  if (name.includes('sierra')) return 95;
  if (name.includes('leila') || name.includes('lola')) return 72;
  if (name.includes('closer')) return 138;
  if (name.includes('scraper')) return 24;
  if (name.includes('scribe')) return 41;
  if (name.includes('curator')) return 58;
  
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 85) + 15;
};

// Deterministic active listings generator
const getActiveListingsForAgent = (agentId: string): number => {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 45) + 5;
};

interface LeaderboardAgent {
  id: string;
  name: string;
  emoji: string;
  deals: number;
  listings: number;
  totalLeads: number;
  color: string;
  tasks: number;
}

const CloseRateGauge = ({ deals, totalLeads, color }: { deals: number, totalLeads: number, color: string }) => {
  const rate = totalLeads > 0 ? (deals / totalLeads) * 100 : 0;
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-800 shrink-0">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="16" cy="16" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-800" />
          <circle 
            cx="16" cy="16" r={radius} stroke={color} strokeWidth="3" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-[8px] font-mono font-bold" style={{ color }}>
          {Math.round(rate)}%
        </span>
      </div>
      <div className="hidden sm:block min-w-[50px]">
        <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-1">Close Rate</p>
        <p className="text-[10px] font-mono text-slate-400 leading-none">
          <span className="text-white font-bold">{deals}</span> / {totalLeads}
        </p>
      </div>
    </div>
  );
};

export default function AgentLeaderboard() {
  const [agentsData, setAgentsData] = useState<Agent[]>([]);
  const [leadsData, setLeadsData] = useState<{ ownerId: string }[]>([]);

  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, 'agents'), (snap) => {
      const loaded: Agent[] = [];
      snap.forEach(doc => {
        if (doc.data().name) {
          loaded.push({ id: doc.id, ...doc.data() } as Agent);
        }
      });
      setAgentsData(loaded);
    });

    const unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
      const loaded: { ownerId: string }[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.ownerId) {
          loaded.push({ ownerId: d.ownerId });
        }
      });
      setLeadsData(loaded);
    });

    return () => {
      unsubAgents();
      unsubLeads();
    };
  }, []);

  const agents = useMemo(() => {
    return agentsData.map((d) => {
      const deterministicDeals = getDeals30DaysForAgent(d.id, d.name);
      const realAssigned = leadsData.filter(l => l.ownerId === d.id).length;
      
      // Simulate total leads using closing rate logic (base metric + live dynamic data)
      // We aim for typical real estate agent close rates between 5% and 25% (i.e., multiplier 4 to 20)
      const multiplier = 4 + (d.id.charCodeAt(0) % 8); 
      const simLeads = Math.round(deterministicDeals * multiplier);
      const totalLeads = simLeads + realAssigned;

      return {
        id: d.id,
        name: d.name,
        emoji: d.emoji || '👤',
        color: d.color || '#3b82f6',
        tasks: d.tasks || 0,
        deals: deterministicDeals,
        listings: getActiveListingsForAgent(d.id),
        totalLeads: totalLeads
      };
    }).sort((a, b) => b.deals - a.deals);
  }, [agentsData, leadsData]);

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-fade-in-up mt-6">
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#C9A24A] font-bold select-none">
          AGENT LEADERBOARD
        </span>
        <span className="font-mono text-[10px] text-slate-500 uppercase">30-Day Activity</span>
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-800">
              <th className="py-3 px-5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold w-12 text-center">Rank</th>
              <th className="py-3 px-5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Agent Name</th>
              <th className="py-3 px-5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold text-right">Active Listings</th>
              <th className="py-3 px-5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold text-right">Closed Deals</th>
              <th className="py-3 px-5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold text-right w-32">Performance</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, idx) => (
              <tr key={agent.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition group">
                <td className="py-3 px-5 text-center font-mono text-xs">
                  {idx === 0 ? <span className="text-[#C9A24A] text-lg">🥇</span> : 
                   idx === 1 ? <span className="text-slate-300 text-lg">🥈</span> : 
                   idx === 2 ? <span className="text-[#b47a46] text-lg">🥉</span> : 
                   <span className="text-slate-500">#{idx + 1}</span>}
                </td>
                <td className="py-3 px-5">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-lg shadow-inner border border-white/5"
                      style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                    >
                      {agent.emoji}
                    </div>
                    <span className="font-bold text-slate-200 text-sm whitespace-nowrap">{agent.name}</span>
                    <CloseRateGauge deals={agent.deals} totalLeads={agent.totalLeads} color={agent.color} />
                  </div>
                </td>
                <td className="py-3 px-5 text-right font-mono text-sm text-cyan-400 font-medium">
                  {agent.listings}
                </td>
                <td className="py-3 px-5 text-right font-mono text-sm text-emerald-400 font-bold">
                  {agent.deals}
                </td>
                <td className="py-3 px-5 text-right">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${Math.min(100, (agent.deals / (agents[0]?.deals || 1)) * 100)}%`, backgroundColor: agent.color }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 font-mono text-sm">Loading agents data...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
