import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../lib/apiClient';
import { Lead, Agent, SearchLog } from '../types';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardWidgets from './DashboardWidgets';
import AgentLeaderboard from './AgentLeaderboard';
import ActivityFeed from './ActivityFeed';

const CHART_DATA = [
  { month: 'Jan', deals: 35, revenue: 1.1 },
  { month: 'Feb', deals: 42, revenue: 1.4 },
  { month: 'Mar', deals: 38, revenue: 1.2 },
  { month: 'Apr', deals: 65, revenue: 2.1 },
  { month: 'May', deals: 55, revenue: 1.8 },
  { month: 'Jun', deals: 82, revenue: 2.6 },
  { month: 'Jul', deals: 97, revenue: 3.2 },
];

interface OverviewPageProps {
  T: (key: string) => string;
}

export default function OverviewPage({ T }: OverviewPageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [listingsCount, setListingsCount] = useState<number>(1547);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchLog[]>([]);
  const [searchRange, setSearchRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(true);

  const CustomSearchTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isNew = data.changeText === 'New';
      const isPositive = !isNew && data.pctChange >= 0;
      
      const currentLabel = searchRange === '7d' ? '0-7d' : searchRange === '30d' ? '0-30d' : 'Recent';
      const previousLabel = searchRange === '7d' ? '7-14d' : searchRange === '30d' ? '30-60d' : 'Older';

      return (
        <div className="bg-[#0a0f1d]/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="font-mono text-[9px] text-[#22d3ee] uppercase tracking-widest mb-1 select-none font-bold">
            Analytics Tooltip
          </p>
          <p className="text-sm font-semibold text-slate-100 capitalize mb-2 border-b border-slate-800 pb-1.5">
            "{data.term}"
          </p>
          <div className="space-y-1.5 font-sans text-xs">
            <div className="flex justify-between items-center gap-8">
              <span className="text-slate-400">Current ({currentLabel}):</span>
              <span className="font-semibold text-[#22d3ee] font-mono">{data.count} searches</span>
            </div>
            <div className="flex justify-between items-center gap-8 border-b border-slate-800/40 pb-1.5 mb-1.5">
              <span className="text-slate-400">Previous ({previousLabel}):</span>
              <span className="font-semibold text-slate-350 font-mono">{data.previousCount} searches</span>
            </div>
            <div className="flex justify-between items-center gap-8">
              <span className="text-slate-400">Period Change:</span>
              {isNew ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono bg-[#22d3ee]/10 text-[#22d3ee]">
                  ★ {data.changeText}
                </span>
              ) : isPositive ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono bg-emerald-500/10 text-emerald-400 font-bold">
                  ▲ {data.changeText}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono bg-rose-500/10 text-rose-400 font-bold">
                  ▼ {data.changeText}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    // Fetch all searches for dynamic date filtering (7d, 30d, all-time)
    const qSearches = collection(db, 'searches');
    const unsubSearches = onSnapshot(
      qSearches,
      (snap) => {
        const loaded: SearchLog[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          loaded.push({
            id: doc.id,
            query: d.query,
            scope: d.scope,
            timestamp: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(),
            userId: d.userId,
            isVoice: d.isVoice,
          });
        });
        setRecentSearches(loaded);
      },
      (err) => console.error('Error fetching searches:', err)
    );

    return () => {
      unsubSearches();
    };
  }, []);

  // Backend-polled leads/listings-count/agents (replaces Firestore onSnapshot — see ARCHITECTURE_INTEGRATION.md).
  useEffect(() => {
    const refresh = async () => {
      try {
        const [{ leads: loadedLeads }, { listings }, { agents: loadedAgents }] = await Promise.all([
          api.get<{ leads: any[] }>('/api/admin/leads'),
          api.get<{ listings: any[] }>('/api/admin/listings'),
          api.get<{ agents: any[] }>('/api/admin/agents'),
        ]);
        setLeads(
          loadedLeads.map((d) => ({
            ...d,
            createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
            updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
          }))
        );
        setListingsCount(listings.length || 1547);
        setAgents(loadedAgents.map((d) => ({ ...d, updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date() })));
      } catch (err) {
        console.error('Failed to fetch overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, []);

  // Compute stats
  const activeLeadsCount = leads.length;
  const hotLeads = leads.filter(l => l.hot);

  // Sparkline generator
  const renderSparkline = (spark: number[], color: string) => {
    const max = Math.max(...spark, 1);
    return (
      <div className="flex items-end gap-[2px] h-6 mt-2">
        {spark.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm min-h-[3px] transition-all duration-300"
            style={{
              height: `${(v / max) * 100}%`,
              backgroundColor: i === spark.length - 1 ? color : `${color}40`
            }}
          />
        ))}
      </div>
    );
  };

  const CARD_STATS = [
    { val: listingsCount.toString(), lbl: T('totalListings'), delta: '+12% this week', up: true, color: '#06b6d4', spark: [42, 55, 48, 70, 62, 85, 95] },
    { val: activeLeadsCount.toString(), lbl: T('activeLeads'), delta: `+${hotLeads.length} hot today`, up: true, color: '#3b82f6', spark: [30, 45, 38, 55, 48, 70, 80] },
    { val: 'EGP 6.2M', lbl: T('avgDeal'), delta: '+5% MoM', up: true, color: '#10b981', spark: [55, 60, 52, 68, 65, 78, 88] },
    { val: '97', lbl: T('dealsClosed'), delta: 'This month', up: true, color: '#8b5cf6', spark: [20, 35, 28, 48, 42, 65, 75] },
  ];

  const searchTermsData = useMemo(() => {
    const now = new Date();
    
    const currentCounts: Record<string, number> = {};
    const previousCounts: Record<string, number> = {};

    recentSearches.forEach(search => {
      if (!search.query) return;
      const term = search.query.toLowerCase().trim();
      if (!term) return;

      const searchTime = search.timestamp instanceof Date ? search.timestamp : new Date(search.timestamp);
      
      if (searchRange === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        if (searchTime >= sevenDaysAgo) {
          currentCounts[term] = (currentCounts[term] || 0) + 1;
        } else if (searchTime >= fourteenDaysAgo) {
          previousCounts[term] = (previousCounts[term] || 0) + 1;
        }
      } else if (searchRange === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        if (searchTime >= thirtyDaysAgo) {
          currentCounts[term] = (currentCounts[term] || 0) + 1;
        } else if (searchTime >= sixtyDaysAgo) {
          previousCounts[term] = (previousCounts[term] || 0) + 1;
        }
      }
    });

    if (searchRange === 'all') {
      const sorted = [...recentSearches]
        .filter(s => s.query && s.query.trim())
        .sort((a, b) => {
          const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
          const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
          return tb - ta;
        });
      const mid = Math.ceil(sorted.length / 2);
      sorted.forEach((search, idx) => {
        const term = search.query.toLowerCase().trim();
        if (idx < mid) {
          currentCounts[term] = (currentCounts[term] || 0) + 1;
        } else {
          previousCounts[term] = (previousCounts[term] || 0) + 1;
        }
      });
    }

    return Object.entries(currentCounts)
      .map(([term, currentCount]) => {
        const previousCount = previousCounts[term] || 0;
        let pctChange = 0;
        let changeText = 'New';
        
        if (previousCount > 0) {
          const rawPct = ((currentCount - previousCount) / previousCount) * 100;
          pctChange = parseFloat(rawPct.toFixed(1));
          changeText = pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`;
        }

        return {
          term,
          count: currentCount,
          previousCount,
          pctChange,
          changeText,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [recentSearches, searchRange]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Cards stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARD_STATS.map((k, i) => (
          <div
            key={i}
            className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300 shadow-inner"
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ backgroundColor: k.color }}
            />
            <div className="text-2xl font-bold text-white tracking-tight">
              {k.val}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1 select-none">
              {k.lbl}
            </div>
            <div className={`text-[9px] font-mono font-semibold mt-1 ${k.up ? 'text-green-400' : 'text-red-400'}`}>
              {k.up ? '↑' : '↓'} {k.delta}
            </div>
            {renderSparkline(k.spark, k.color)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step Funnel Chart */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-805 bg-slate-900/40">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              {T('pipelineTitle')}
            </span>
          </div>
          <div className="p-5 flex items-end gap-2.5 h-[130px]">
            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'].map((s, i) => {
              const h = [95, 88, 82, 79, 74, 68, 61, 55, 42, 28][i];
              const c = ['#06b6d4', '#22d3ee', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#3b82f6', '#10b981', '#22d3ee'][i];
              return (
                <div key={s} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full rounded-t-sm min-h-[4px] hover:brightness-110 transition duration-150 tooltip"
                    style={{
                      height: `${h}%`,
                      background: `linear-gradient(to top, ${c}25, ${c})`
                    }}
                    title={`${s}: ${h}%`}
                  />
                  <span className="font-mono text-[8px] text-slate-500 select-none">{s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hot Leads Section */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              {T('hotLeads')}
            </span>
            <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
              {hotLeads.length} Urgent
            </span>
          </div>
          <div className="flex-1 max-h-[160px] overflow-y-auto divide-y divide-slate-800/30">
            {loading ? (
              <div className="p-4 text-center font-mono text-[10px] text-slate-500">LOADING LEADS FROM FIRESTORE...</div>
            ) : hotLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No hot leads active currently.</div>
            ) : (
              hotLeads.slice(0, 5).map((l) => (
                <div key={l.id} className="p-3 flex items-center gap-3 hover:bg-white/5 transition">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs select-none shadow text-[#05080f] shrink-0"
                    style={{ backgroundColor: l.color || '#06b6d4' }}
                  >
                    {l.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">{l.name}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{l.interest}</div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 bg-cyan-950/30 border border-cyan-800 text-cyan-400">
                    {l.stage}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Activity Tracker */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              {T('agentStatus')}
            </span>
          </div>
          <div className="p-4 space-y-3.5 max-h-[160px] overflow-y-auto">
            {agents.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center gap-2.5">
                <span className="text-base shrink-0 select-none">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-200 truncate">{a.name}</span>
                    <span className={`text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 rounded ${
                      a.status === 'Online' || a.status === 'Running' ? 'text-green-400' : 'text-amber-500'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="w-full bg-slate-850 rounded-full h-[3px] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${a.load}%`, backgroundColor: a.color || '#06b6d4' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Recharts Dual-Axis Visualization */}
        <div className="lg:col-span-2 bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              {T('pipelineAndRevenueTrends') || 'PIPELINE & REVENUE TRENDS'}
            </span>
          </div>
          <div className="p-5 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={CHART_DATA}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0a0f1d', borderColor: '#1e293b', fontSize: '12px', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="deals" name="Monthly Deals Closed" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue Pipeline (M)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0a0f1d' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Logs Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        {/* Popular Search Terms Chart */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-fade-in-up">
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              {searchRange === '7d' 
                ? (T('popularSearches7d') || 'TOP SEARCH TERMS (LAST 7 DAYS)') 
                : searchRange === '30d' 
                ? (T('popularSearches30d') || 'TOP SEARCH TERMS (LAST 30 DAYS)') 
                : (T('popularSearchesAll') || 'TOP SEARCH TERMS (ALL TIME)')}
            </span>
            <select
              id="overview-search-range-select"
              value={searchRange}
              onChange={(e) => setSearchRange(e.target.value as any)}
              className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-cyan-500 transition-all font-sans cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="p-5 h-[300px] w-full">
            {searchTermsData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-[10px] text-slate-500">
                NO RECENT SEARCHES...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={searchTermsData}
                  layout="vertical"
                  margin={{ top: 20, right: 20, bottom: 20, left: 60 }}
                >
                  <CartesianGrid stroke="#1e293b" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="term" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    content={<CustomSearchTooltip />}
                  />
                  <Bar dataKey="count" name="Search Frequency" fill="#22d3ee" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Leads by source & Property Scatter */}
      <DashboardWidgets />

      {/* Agent Leaderboard */}
      <AgentLeaderboard />
    </div>
  );
}
