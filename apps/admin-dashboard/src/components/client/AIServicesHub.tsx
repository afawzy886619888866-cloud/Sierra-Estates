import React, { useState } from 'react';
import ROICalculator from './ROICalculator';
import PricingCalculator from './PricingCalculator';
import DreamHomeWizard from './DreamHomeWizard';

interface AIServicesHubProps {
  theme: string;
  isAr: boolean;
  /** Bubble the recommended/selected compound up so the parent can scroll to contact. */
  onRequestCompound?: (compound: string) => void;
}

type Tool = 'chat' | 'roi' | 'price' | 'dream';

const AI_RESP_EN: Record<string, string> = {
  hyde: 'Hyde Park (AI 9.8) — units from EGP 8.8M. Capital appreciation +22% YoY. Best for luxury buyers.',
  mivida: 'Mivida by Emaar — best rental yield in 5th Settlement at 7.2%. Units from EGP 3.4M.',
  roi: 'Top ROI: ① Uptown Cairo +31% ② Mountain View +24% ③ Hyde Park +22% ④ Villette +20%.',
  invest: 'Top 2026 picks: Mountain View iCity (+24%), Palm Hills NC (+21%), Villette (+20%).',
  rent: 'Best rentals: Madinaty from $900/mo · Mivida $2,100/mo · Hyde Park $5,200/mo.',
  compare: 'Hyde Park vs Mivida: Hyde wins ROI (+22% vs +18%). Mivida wins rental yield (7.2%).',
  default: "I'm Sierra, your AI concierge for New Cairo. Ask me about compounds, ROI, pricing or viewings.",
};

const AI_RESP_AR: Record<string, string> = {
  hyde: 'هايد بارك (ذكاء 9.8) — وحدات من 8.8 مليون جنيه. ارتفاع رأسمالي +22٪ سنوياً. الأفضل لمشتري الفخامة.',
  mivida: 'ميفيدا من إعمار — أفضل عائد إيجاري في التجمع الخامس بنسبة 7.2٪. وحدات من 3.4 مليون جنيه.',
  roi: 'أفضل عائد: ① أبتاون +31٪ ② ماونتن فيو +24٪ ③ هايد بارك +22٪ ④ فيليت +20٪.',
  invest: 'أفضل اختيارات 2026: ماونتن فيو (+24٪)، بالم هيلز (+21٪)، فيليت (+20٪).',
  rent: 'أفضل الإيجارات: مدينتي من 900$ · ميفيدا 2100$ · هايد بارك 5200$.',
  compare: 'هايد بارك مقابل ميفيدا: هايد يفوز بالعائد (+22٪). ميفيدا تفوز بعائد الإيجار (7.2٪).',
  default: 'أنا سيرا، مستشارك الذكي للقاهرة الجديدة. اسألني عن المجمعات أو العوائد أو الأسعار أو المعاينات.',
};

function matchResp(text: string, isAr: boolean): string {
  const tbl = isAr ? AI_RESP_AR : AI_RESP_EN;
  const q = text.toLowerCase();
  if (q.includes('hyde') || q.includes('هايد')) return tbl.hyde;
  if (q.includes('mivida') || q.includes('ميفيدا')) return tbl.mivida;
  if (q.includes('roi') || q.includes('عائد') || q.includes('yield')) return tbl.roi;
  if (q.includes('rent') || q.includes('إيجار')) return tbl.rent;
  if (q.includes('compare') || q.includes('قارن')) return tbl.compare;
  if (q.includes('invest') || q.includes('استثمار')) return tbl.invest;
  return tbl.default;
}

export default function AIServicesHub({ theme, isAr, onRequestCompound }: AIServicesHubProps) {
  const [tool, setTool] = useState<Tool>('chat');

  // Chat state
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<{ sender: 'ai' | 'user'; text: string; id: number }[]>([
    { sender: 'ai', text: (isAr ? AI_RESP_AR : AI_RESP_EN).default, id: 1 },
  ]);
  const [typing, setTyping] = useState(false);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const id = msgs.length + 1;
    setMsgs((p) => [...p, { sender: 'user', text: q, id }]);
    setInput('');
    setTyping(true);
    const resp = matchResp(q, isAr);
    setTimeout(() => {
      setTyping(false);
      setMsgs((p) => [...p, { sender: 'ai', text: resp, id: id + 1 }]);
    }, 1000);
  };

  const chips = isAr
    ? ['أفضل عائد', 'قارن المجمعات', 'اختيارات الاستثمار', 'إيجار ميفيدا', 'هايد بارك']
    : ['Best ROI', 'Compare compounds', 'Invest picks', 'Mivida rent', 'Hyde Park'];

  const TABS: { k: Tool; label: string; sub: string; accent: string }[] = [
    { k: 'chat', label: isAr ? 'سيرا الذكي' : 'Sierra AI', sub: isAr ? 'مستشار المحادثة الفوري' : 'Live chat concierge', accent: '#C8961A' },
    { k: 'roi', label: isAr ? 'تحليل العائد' : 'ROI Analysis', sub: isAr ? 'قوائم العائد وحاسبة الاستثمار' : 'Yield leaderboard & calculator', accent: '#f59e0b' },
    { k: 'price', label: isAr ? 'تسعير دقيق' : 'Precise Pricing', sub: isAr ? 'نطاق السعر العادل بالسوق' : 'AVM fair-market range', accent: '#a78bfa' },
    { k: 'dream', label: isAr ? 'منزل الأحلام' : 'Dream Home Finder', sub: isAr ? '4 أسئلة ← مجمعك' : '4 questions → your compound', accent: '#f472b6' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Tool switcher rail */}
      <div className="space-y-2.5">
        {TABS.map((tb) => {
          const active = tool === tb.k;
          return (
            <button
              key={tb.k}
              onClick={() => setTool(tb.k)}
              className={`w-full text-left p-4 rounded-2xl border transition group ${
                active
                  ? 'border-[#C8961A]/50 bg-[#C8961A]/10 shadow-lg'
                  : theme === 'light'
                    ? 'border-[#C8961A]/10 bg-white hover:border-[#C8961A]/30'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: tb.accent }} />
                <span className={`font-serif text-base font-medium ${active ? 'text-[#E9C176]' : 'text-white'}`}>{tb.label}</span>
              </div>
              <div className="text-[11px] text-slate-400 pl-4">{tb.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Active tool panel */}
      <div
        className={`rounded-2xl border p-5 md:p-6 min-h-[420px] ${
          theme === 'light' ? 'border-[#C8961A]/10 bg-white' : 'border-slate-800 bg-slate-950'
        }`}
      >
        {tool === 'chat' && (
          <div className="flex flex-col h-full min-h-[380px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-serif text-lg text-white font-medium">Sierra Estates AI</span>
              <span className="font-mono text-[7.5px] uppercase tracking-widest text-[#C8961A] ml-auto">
                {isAr ? 'مستشار القاهرة الجديدة' : 'New Cairo Concierge'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-3 max-h-[300px]">
              {msgs.map((m) => {
                const ai = m.sender === 'ai';
                return (
                  <div key={m.id} className={`flex ${ai ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        ai
                          ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                          : 'bg-[#C8961A] text-[#0D2035] font-semibold rounded-tr-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="flex gap-1.5 p-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#C8961A] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {chips.map((ch) => (
                <button
                  key={ch}
                  onClick={() => send(ch)}
                  className="py-1 px-2.5 rounded-full border border-[#C8961A]/20 bg-[#C8961A]/5 text-[#E9C176] text-[9.5px] hover:bg-[#C8961A]/15 transition font-mono active:scale-95"
                >
                  {ch}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                placeholder={isAr ? "اسأل سيرا، مثلاً 'أسعار أبتاون'..." : "Ask Sierra e.g., 'Uptown pricing'..."}
                className="flex-1 text-xs bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-[#C8961A]/50 font-mono"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold bg-[#C8961A] hover:bg-[#E9C176] text-[#0D2035] active:scale-90 transition disabled:opacity-40"
              >
                ↗
              </button>
            </div>
          </div>
        )}

        {tool === 'roi' && <ROICalculator theme={theme} isAr={isAr} />}
        {tool === 'price' && <PricingCalculator theme={theme} isAr={isAr} />}
        {tool === 'dream' && <DreamHomeWizard theme={theme} isAr={isAr} onViewUnits={onRequestCompound} />}
      </div>
    </div>
  );
}
