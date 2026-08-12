import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { FunnelChart, Funnel, Tooltip, LabelList, ResponsiveContainer, Cell } from 'recharts';

const STAGE_ORDER = [
  'Initial Contact',
  'AI Matched',
  'Viewing Scheduled',
  'Negotiating',
  'Contract Draft'
];

const COLORS = [
  '#3b82f6', // Initial Contact
  '#0ea5e9', // AI Matched
  '#10b981', // Viewing Scheduled
  '#f59e0b', // Negotiating
  '#8b5cf6'  // Contract Draft
];

export default function LeadsFunnelWidget() {
  const [funnelData, setFunnelData] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'leads'), (snap) => {
      const counts: Record<string, number> = {
        'Initial Contact': 0,
        'AI Matched': 0,
        'Viewing Scheduled': 0,
        'Negotiating': 0,
        'Contract Draft': 0
      };
      
      snap.forEach(doc => {
        const data = doc.data();
        if (data.stage && counts[data.stage] !== undefined) {
          counts[data.stage]++;
        }
      });

      // Construct funnel data, descending conceptually but we'll use exact counts.
      // Recharts FunnelChart sorts by value, so we'll need to be careful.
      // Actually Recharts Funnel sorts by value ascending/descending by default. 
      // If we want a strict order regardless of count, we might just pass data.
      let data = STAGE_ORDER.map((stage, i) => ({
        name: stage === 'Contract Draft' ? 'Contract / Closed' : stage,
        value: counts[stage] || 0,
        fill: COLORS[i]
      }));

      // To make it look like a funnel even if real data isn't perfectly funnel-shaped,
      // often in funnels we accumulate from the bottom, or just show raw counts.
      // Recharts handles raw counts. If numbers are not strictly decreasing, it can look weird.
      // Let's just use raw counts and Recharts' default funnel capabilities.
      // E.g., sort descending to ensure funnel shape:
      data.sort((a, b) => b.value - a.value);

      setFunnelData(data);
    }, (err) => {
      console.error("DashboardWidgets failed to load leads", err);
    });

    return () => unsub();
  }, []);

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl w-full h-full min-h-[300px]">
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
        <span className="font-mono text-[10px] uppercase tracking-wider text-purple-400 font-bold select-none">
          PIPELINE FUNNEL
        </span>
      </div>
      <div className="p-5 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ backgroundColor: '#0a0f1d', borderColor: '#1e293b', fontSize: '12px', color: '#f8fafc', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive
            >
              <LabelList position="right" fill="#94a3b8" stroke="none" dataKey="name" fontSize={11} fontFamily="monospace" />
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
