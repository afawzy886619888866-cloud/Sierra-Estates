import React, { useState, useEffect } from 'react';
import { createSierraNotification } from '../firebase';

interface ScrapeFeed {
  id: string;
  ts: string;
  src: string;
  raw: string;
  compound: string;
  type: string;
  code: string;
  status: 'parsed' | 'processing';
}

const COMPOUNDS = ['Mivida', 'Hyde Park', 'Mountain View iCity', 'Uptown Cairo', 'Madinaty', 'Eastown', 'Villette'];

const INITIAL_FEEDS: ScrapeFeed[] = [
  { id: 'WA-0041', ts: '14:23:01', src: 'Group: New Cairo Properties', raw: 'شقة 3 غرف ميفيدا · دور 3 · 95م² · 14,500/شهر', compound: 'Mivida', type: 'Apartment', code: 'SE-MVD-APT-0041-2026', status: 'parsed' },
  { id: 'WA-0040', ts: '14:19:44', src: 'PropertyFinder Monitor', raw: 'Villa Hyde Park · 5+1 BHK · 450m² · private pool · EGP 35M', compound: 'Hyde Park', type: 'Villa', code: 'SE-HYP-VLA-0040-2026', status: 'parsed' },
  { id: 'WA-0039', ts: '14:17:12', src: 'OLX Scraper', raw: 'Penthouse Uptown Cairo · 320m · 4bed+maid · lake view · EGP 18.5M', compound: 'Uptown Cairo', type: 'Penthouse', code: 'SE-UPC-PTH-0039-2026', status: 'parsed' },
  { id: 'WA-0038', ts: '14:14:55', src: 'Group: Cairo Rentals', raw: 'توين هاوس ماونتن فيو · 240م · 4 غرف · 28,000/شهر', compound: 'Mountain View iCity', type: 'Twin House', code: 'SE-MVI-TWH-0038-2026', status: 'processing' },
  { id: 'WA-0037', ts: '14:11:03', src: 'Telegram: MadinatyGroups', raw: 'Apartment Madinaty B10 · 165m · 3bed · EGP 4.2M · owner direct', compound: 'Madinaty', type: 'Apartment', code: 'SE-MDN-APT-0037-2026', status: 'parsed' },
];

export default function NexusAIPage() {
  const [feed, setFeed] = useState<ScrapeFeed[]>(INITIAL_FEEDS);
  const [counter, setCounter] = useState(41);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    // Emulate new listings scraping alerts every 3.5 seconds
    const interval = setInterval(() => {
      const cpd = COMPOUNDS[Math.floor(Math.random() * COMPOUNDS.length)];
      const types = ['Apartment', 'Villa', 'Twin House', 'Duplex', 'Penthouse'];
      const typ = types[Math.floor(Math.random() * types.length)];
      
      const d = new Date();
      const ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      
      const area = Math.floor(Math.random() * 280) + 100;
      const priceVal = (Math.random() * 22 + 3).toFixed(1);

      setCounter((prev) => {
        const nextCount = prev + 1;
        const prefix = cpd.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
        const code = `SE-${prefix}-${typ.slice(0, 3).toUpperCase()}-${String(nextCount).padStart(4, '0')}-2026`;

        const newFeedItem: ScrapeFeed = {
          id: `WA-00${nextCount}`,
          ts,
          src: 'WhatsApp Scraper Bot',
          raw: `${typ} ${cpd} · ${area}m² · EGP ${priceVal}M`,
          compound: cpd,
          type: typ,
          code,
          status: Math.random() > 0.15 ? 'parsed' : 'processing'
        };

        const isErrorTriggerObj = nextCount % 10 === 0;
        const isListingTriggerObj = nextCount % 4 === 0;

        if (isErrorTriggerObj) {
          createSierraNotification(
            'error',
            `Scraper Engine Warning: OLX Rate Limit`,
            `The OLX scraping crawler was rate-limited on IP gateway node-02. Re-routing through proxy proxy-04.`,
            `تحذير نظام البحث: حد الطلبات في OLX`,
            `تم تجاوز حد الطلبات في محرك جمع OLX على العقدة node-02. يتم الآن تحويل المسار عبر خادم بروكسي proxy-04.`
          );
        } else if (isListingTriggerObj) {
          createSierraNotification(
            'listing',
            `Ingested listing via Scraper: ${code}`,
            `Standardised a new ${typ} in ${cpd} with Area ${area}m². Extracted price: EGP ${priceVal}M.`,
            `تم استخلاص عقار جديد: ${code}`,
            `تم جمع وتصنيف وحدة ${typ} جديدة في كمبوند ${cpd} بمساحة ${area}م² بسعر EGP ${priceVal}M.`
          );
        }

        setFeed((prevFeed) => [newFeedItem, ...prevFeed].slice(0, 12));
        return nextCount;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const filteredFeeds = filter === 'All' ? feed : feed.filter((m) => m.compound === filter);

  const KPIS = [
    { label: 'Scraped Today', value: counter, color: '#06b6d4' },
    { label: 'Successfully Parsed', value: Math.round(counter * 0.93), color: '#34D399' },
    { label: 'Ingestion Queue', value: Math.max(0, Math.round(counter * 0.06)), color: '#1E88D9' },
    { label: 'Misfires / Warnings', value: Math.max(0, Math.round(counter * 0.01)), color: '#E63946' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Dynamic Scraper Activity Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <div
            key={i}
            className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
            style={{ borderTop: `2px solid ${k.color}` }}
          >
            <div className="text-xl font-mono font-bold text-white select-all">{k.value}</div>
            <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider select-none mt-2">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Chips Toolbar */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <span className="font-mono text-[9px] uppercase tracking-wide text-slate-550 select-none">
          Filter Scraped Nodes:
        </span>
        {['All', ...COMPOUNDS].map((c) => {
          const isSelected = filter === c;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 text-[10px] font-medium font-mono rounded-lg transition duration-150 border cursor-pointer select-none ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-[#0a0f1d] hover:bg-white/5 border-slate-800 text-slate-400'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Feeds scroll */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              📥 Scraper Active Feeds
            </span>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold animate-pulse">
              ● SCANNING
            </span>
          </div>
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/40">
            {filteredFeeds.map((feedItem) => (
              <div
                key={feedItem.id}
                className="p-3.5 hover:bg-white/2 transition duration-200"
              >
                <div className="flex justify-between font-mono text-[9px] text-slate-400 mb-1 leading-none select-none">
                  <span className="text-cyan-400 font-bold">{feedItem.id}</span>
                  <span>{feedItem.ts}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed select-all font-sans">{feedItem.raw}</p>
                <div className="flex items-center gap-2 mt-2 select-none">
                  <span className={`text-[8px] px-1.5 py-0.5 font-bold uppercase rounded border ${
                    feedItem.status === 'parsed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/10'
                  }`}>
                    {feedItem.status}
                  </span>
                  <span className="font-mono text-[8.5px] text-cyan-400/50">{feedItem.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live parse analysis */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              📊 Live Parsing Success Indicators
            </span>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: 'Fully Extracted', val: 93, color: '#34D399' },
              { label: 'Under Verification', val: 6, color: '#1E88D9' },
              { label: 'Parsing Failures', val: 1, color: '#E63946' },
              { label: 'Arabic Entries Scraped', val: 38, color: '#06b6d4' },
              { label: 'English Entries Scraped', val: 62, color: '#7C3AED' },
            ].map((col, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono select-none">
                  <span className="text-slate-400 hover:text-white transition duration-150">{col.label}</span>
                  <span className="font-bold text-white">{col.val}%</span>
                </div>
                <div className="bg-white/5 rounded-full h-[3px] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${col.val}%`, backgroundColor: col.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scraped assets table registry */}
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold select-none">
              🔢 Ingestion Code Ledger
            </span>
            <span className="text-[9.5px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded">
              {counter} Total
            </span>
          </div>
          <div className="flex-1 max-h-[380px] overflow-y-auto divide-y divide-slate-800/40">
            {filteredFeeds.map((lst) => (
              <div key={lst.id} className="p-3 flex items-center gap-3 hover:bg-white/1 transition duration-100">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: lst.status === 'parsed' ? '#34D399' : '#06b6d4' }}
                />
                <div className="flex-1 min-w-0 font-mono text-[10px]">
                  <p className="font-bold text-white truncate">{lst.code}</p>
                  <p className="text-slate-500 mt-0.5 truncate uppercase">
                    {lst.compound} · {lst.type}
                  </p>
                </div>
                <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 ${
                  lst.status === 'parsed'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                    : 'bg-amber-500/10 text-amber-550 border-amber-500/10'
                }`}>
                  {lst.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
