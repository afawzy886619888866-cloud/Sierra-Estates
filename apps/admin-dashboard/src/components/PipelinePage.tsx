/**
 * PipelinePage — Kanban-style deal pipeline view.
 * Ported from Admin A (apps/sierra-estates-realty/app/admin/AdminPortal.tsx)
 * and upgraded with real Firestore onSnapshot for the `deals` collection.
 */
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const PIPE_STAGES = [
  { k: 'New', ar: 'جديد', c: '#1E88D9' },
  { k: 'Qualifying', ar: 'تأهيل', c: '#7C3AED' },
  { k: 'Viewing', ar: 'معاينة', c: '#f59e0b' },
  { k: 'Negotiation', ar: 'تفاوض', c: '#00AEFF' },
  { k: 'Closed Won', ar: 'مغلقة ـ فوز', c: '#34D399' },
  { k: 'Closed Lost', ar: 'مغلقة ـ خسارة', c: '#E63946' },
] as const;

interface Deal {
  id: string;
  client?: string;
  property?: string;
  value?: string;
  stage?: string;
  aiScore?: number;
}

const FALLBACK_DEALS: Deal[] = [
  { id: 'd1', client: 'Ahmed Al-Rashid', property: 'Villa · Hyde Park', value: 'EGP 20M', stage: 'Negotiation', aiScore: 9.4 },
  { id: 'd2', client: 'Khalid Mansour', property: 'Penthouse · Uptown Cairo', value: 'EGP 15M', stage: 'Negotiation', aiScore: 9.1 },
  { id: 'd3', client: 'Sara Mohamed', property: '3-Bed · Mivida · Rent', value: '$2.4K/mo', stage: 'Viewing', aiScore: 8.7 },
  { id: 'd4', client: 'Omar Farouk', property: 'Twin House · Mountain View', value: 'EGP 12.5M', stage: 'Viewing', aiScore: 8.9 },
  { id: 'd5', client: 'Nadia Hassan', property: 'Apartment · Madinaty', value: 'EGP 5M', stage: 'Qualifying', aiScore: 8.2 },
  { id: 'd6', client: 'Layla Karim', property: 'Furnished 2-Bed · Eastown', value: '$1.8K/mo', stage: 'New', aiScore: 7.8 },
  { id: 'd7', client: 'Tarek Aziz', property: 'Duplex · Villette', value: 'EGP 9.8M', stage: 'New', aiScore: 8.4 },
  { id: 'd8', client: 'Mona Selim', property: 'Villa · Katameya Heights', value: 'EGP 38M', stage: 'Closed Won', aiScore: 9.7 },
  { id: 'd9', client: 'Hassan Badr', property: 'Studio · Taj City', value: 'EGP 2.1M', stage: 'Closed Lost', aiScore: 6.1 },
];

interface Props {
  T: (k: string) => string;
  isAr: boolean;
}

export default function PipelinePage({ T, isAr }: Props) {
  const [deals, setDeals] = useState<Deal[]>(FALLBACK_DEALS);
  const [filter, setFilter] = useState<'all' | 'active' | 'won'>('all');
  const [loading, setLoading] = useState(true);

  // Real Firestore onSnapshot — falls back to demo data if Firestore is empty
  // or unconfigured. Uses `deals` collection (matches schema in
  // apps/sierra-estates-realty/lib/models/schema.ts).
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db as any, 'deals'),
      (snap) => {
        if (!snap.empty) {
          const data: Deal[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setDeals(data);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Pipeline snapshot failed, using fallback:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const totals = useMemo(() => ({
    all: deals.length,
    active: deals.filter((d) => !d.stage?.startsWith('Closed')).length,
    won: deals.filter((d) => d.stage === 'Closed Won').length,
  }), [deals]);

  const stages = useMemo(() => {
    if (filter === 'active') return PIPE_STAGES.filter((s) => !s.k.startsWith('Closed'));
    if (filter === 'won') return PIPE_STAGES.filter((s) => s.k === 'Closed Won');
    return PIPE_STAGES;
  }, [filter]);

  const moveDeal = async (id: string, newStage: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'deals', id), { stage: newStage });
    } catch (err) {
      console.error('Failed to move deal:', err);
    }
  };

  const filters: Array<[('all' | 'active' | 'won'), string]> = [
    ['all', isAr ? 'كل الصفقات' : 'All Deals'],
    ['active', isAr ? 'النشطة' : 'Active Pipeline'],
    ['won', isAr ? 'المكسوبة' : 'Closed Won'],
  ];

  return (
    <div className="fade-up space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {filters.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-semibold border transition-all ${
              filter === k
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-slate-500">
          {isAr ? 'قيمة الخط' : 'Pipeline value'}:{' '}
          <b className="text-[#C9A24D]">EGP 102.4M</b> · {totals.active} {isAr ? 'نشطة' : 'active'} · {totals.won} {isAr ? 'مكسوبة' : 'won'}
        </span>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((st) => {
          const stageDeals = deals.filter((d) => d.stage === st.k);
          return (
            <div
              key={st.k}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden flex flex-col"
              style={{ borderTopColor: st.c, borderTopWidth: 3 }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: `${st.c}1c`, color: st.c }}
                >
                  {isAr ? st.ar : st.k}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{stageDeals.length}</span>
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[60vh]">
                {stageDeals.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                        {d.client || 'Unknown'}
                      </span>
                      {typeof d.aiScore === 'number' && (
                        <span className="font-mono text-[9px] text-[#C9A24D]">★ {d.aiScore}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1.5 truncate">
                      {d.property || '—'}
                    </div>
                    <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {d.value || '—'}
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="py-6 text-center text-[10px] text-slate-400">
                    {isAr ? 'لا صفقات' : 'No deals'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="text-center text-[11px] text-slate-400">
          {isAr ? 'جاري التحميل من Firestore...' : 'Loading from Firestore...'}
        </div>
      )}
    </div>
  );
}
