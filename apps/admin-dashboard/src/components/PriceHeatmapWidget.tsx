import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ResponsiveContainer, Treemap } from 'recharts';

export default function PriceHeatmapWidget() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'listings'), (snap) => {
      const cmpData: Record<string, { totalArea: number; totalPrice: number; count: number }> = {};

      snap.forEach((doc) => {
        const d = doc.data();
        const cmp = d.cmp || d.compound || 'Unknown';
        const rawPrice = d.price || '';
        const area = Number(d.area) || 0;

        let priceNum = 0;
        if (typeof rawPrice === 'string') {
          const match = rawPrice.match(/[\d,.]+/);
          if (match) {
            let val = parseFloat(match[0].replace(/,/g, ''));
            if (rawPrice.toLowerCase().includes('m') || rawPrice.toLowerCase().includes('مليون')) {
              val *= 1000000;
            } else if (rawPrice.toLowerCase().includes('k') || rawPrice.toLowerCase().includes('ألف')) {
              val *= 1000;
            }
            priceNum = val;
          }
        } else if (typeof rawPrice === 'number') {
          priceNum = rawPrice;
        }

        if (area > 0 && priceNum > 0) {
          if (!cmpData[cmp]) {
            cmpData[cmp] = { totalArea: 0, totalPrice: 0, count: 0 };
          }
          cmpData[cmp].totalArea += area;
          cmpData[cmp].totalPrice += priceNum;
          cmpData[cmp].count += 1;
        }
      });

      const heatmapData = Object.keys(cmpData).map((cmp) => {
        const avgPricePerSqm = cmpData[cmp].totalPrice / cmpData[cmp].totalArea;
        return {
          name: cmp,
          size: cmpData[cmp].count, // weight by count in treemap
          value: Math.round(avgPricePerSqm),
          fill: getColorForPrice(avgPricePerSqm)
        };
      });

      // Provide decent placeholder if no data to show the tool structure
      if (heatmapData.length === 0) {
         setData([
            { name: "Mivida", size: 10, value: 45000, fill: "#0ea5e9" },
            { name: "Hyde Park", size: 5, value: 42000, fill: "#3b82f6" },
         ]);
      } else {
         setData(heatmapData);
      }
    });

    return () => unsub();
  }, []);

  const getColorForPrice = (pricePerSqm: number) => {
    // Basic heat map colors based on threshold
    if (pricePerSqm > 100000) return '#ef4444'; // Red
    if (pricePerSqm > 80000) return '#f97316';  // Orange
    if (pricePerSqm > 60000) return '#eab308';  // Yellow
    if (pricePerSqm > 40000) return '#8b5cf6';  // Purple
    if (pricePerSqm > 20000) return '#3b82f6';  // Blue
    return '#10b981'; // Green
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
         <div className="bg-[#0a0f1d] border border-slate-700 p-3 rounded-lg shadow-xl text-xs text-white z-50">
           <p className="font-bold text-slate-200 mb-1">{p.name}</p>
           <p className="text-slate-400">Listings: <span className="text-white font-mono">{p.size}</span></p>
           <p className="text-slate-400">Avg EGP/sqm: <span className="text-[#C9A24A] font-mono font-bold">{p.value.toLocaleString()}</span></p>
         </div>
      );
    }
    return null;
  };

  const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name, value, fill } = props;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: depth < 2 ? fill : 'none',
            stroke: '#0a0f1d',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1,
            cursor: 'pointer',
            transition: 'fill 0.3s ease-in-out'
          }}
        />
        {width > 50 && height > 30 && (
           <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold" dy={4}>
             {name}
           </text>
        )}
      </g>
    );
  };

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-6 lg:mb-12 animate-fade-in-up">
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400 font-bold select-none">
          Market Pricing Heatmap
        </span>
        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest hidden sm:block">Average EGP per SQM (Compound Index)</span>
      </div>
      <div className="p-4 h-[350px] w-full relative">
         <ResponsiveContainer width="100%" height="100%">
            <Treemap
               data={data}
               dataKey="size"
               aspectRatio={4 / 3}
               stroke="#fff"
               fill="#8884d8"
               content={<CustomizedContent />}
            />
         </ResponsiveContainer>
         {/* Custom Tooltip via raw HTML elements overlaid (Recharts treemap tooltip can be buggy sometimes but we'll try a custom overlay) */}
         
         <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700/50 text-[9px] font-mono">
            <span className="text-slate-400">Scale:</span>
            <div className="flex gap-1 items-center">
               <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
               <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
               <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
               <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500"></span>
               <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
               <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
            </div>
         </div>
      </div>
    </div>
  );
}
