import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell, ZAxis } from 'recharts';
import LeadsFunnelWidget from './LeadsFunnelWidget';

export default function DashboardWidgets() {
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [listingsData, setListingsData] = useState<any[]>([]);

  useEffect(() => {
    // Listen to Leads in Firestore
    const unsubLeads = onSnapshot(
      collection(db, 'leads'),
      (snap) => {
        const sourceCounts: Record<string, number> = {};
        snap.forEach((doc) => {
          const d = doc.data();
          const source = d.source || 'Direct / Organic';
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        
        const chartData = Object.keys(sourceCounts).map(source => ({
          source,
          count: sourceCounts[source]
        })).sort((a, b) => b.count - a.count);
        
        setLeadsData(chartData);
      },
      (err) => {
        console.error("DashboardWidgets failed to load leads", err);
      }
    );

    // Listen to Listings in Firestore
    const unsubListings = onSnapshot(
      collection(db, 'listings'),
      (snap) => {
        const parsedListings: any[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          
          let priceNum = 0;
          if (typeof d.price === 'string') {
            const numMatch = d.price.match(/[\d,.]+/);
            if (numMatch) {
              const val = parseFloat(numMatch[0].replace(/,/g, ''));
              if (d.price.toLowerCase().includes('m') || d.price.toLowerCase().includes('مليون')) {
                priceNum = val * 1000000;
              } else if (d.price.toLowerCase().includes('k') || d.price.toLowerCase().includes('ألف')) {
                priceNum = val * 1000;
              } else {
                priceNum = val;
              }
            }
          } else if (typeof d.price === 'number') {
             priceNum = d.price;
          }
          
          if (priceNum > 0 && d.area > 0) {
            parsedListings.push({
              id: doc.id,
              area: d.area,
              price: priceNum,
              priceFormatted: d.price,
              type: d.type || 'Unknown'
            });
          }
        });
        setListingsData(parsedListings);
      },
      (err) => {
        console.error("DashboardWidgets failed to load listings", err);
      }
    );

    return () => {
      unsubLeads();
      unsubListings();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 animate-fade-in-up">
      {/* Leads by Source Bar Chart */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl lg:col-span-1">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
            LEADS BY SOURCE
          </span>
        </div>
        <div className="p-5 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={leadsData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="source" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                cursor={{ fill: '#1e293b' }}
                contentStyle={{ backgroundColor: '#0a0f1d', borderColor: '#1e293b', fontSize: '12px', color: '#f8fafc', borderRadius: '8px' }}
                itemStyle={{ color: '#06b6d4' }}
              />
              <Bar dataKey="count" name="Lead Count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {leadsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Property Price Distribution Scatter Plot */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl lg:col-span-1">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-bold select-none">
            PROPERTY PRICE DISTRIBUTION
          </span>
        </div>
        <div className="p-5 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="area" 
                name="Area" 
                unit=" sqm" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                type="number" 
                dataKey="price" 
                name="Price" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
              />
              <ZAxis type="category" dataKey="type" name="Type" />
              <RechartsTooltip 
                cursor={{ strokeDasharray: '3 3', stroke: '#334155' }}
                contentStyle={{ backgroundColor: '#0a0f1d', borderColor: '#1e293b', fontSize: '12px', color: '#f8fafc', borderRadius: '8px' }}
                formatter={(value: any, name: any, props: any) => {
                  if (name === 'Price') {
                     const p = value as number;
                     return [p >= 1000000 ? `${(p / 1000000).toFixed(2)}M EGP` : p >= 1000 ? `${(p / 1000).toFixed(0)}K EGP` : p, 'Price'];
                  }
                  return [value, name];
                }}
              />
              <Scatter data={listingsData} fill="#10b981">
                {listingsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.type === 'Apartment' ? '#10b981' : entry.type === 'Villa' ? '#8b5cf6' : '#C9A24A'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leads Funnel Widget */}
      <div className="lg:col-span-1">
        <LeadsFunnelWidget />
      </div>
    </div>
  );
}
