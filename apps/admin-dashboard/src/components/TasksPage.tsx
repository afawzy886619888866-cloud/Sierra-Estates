/**
 * TasksPage — task management with real Firestore onSnapshot.
 * Ported from Admin A (apps/sierra-estates-realty/app/admin/AdminPortal.tsx)
 * and upgraded with real-time Firestore sync on the `tasks` collection.
 */
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Task {
  id: string;
  title: string;
  due?: string;
  priority?: 'high' | 'med' | 'low';
  done: boolean;
  agent?: string;
  createdAt?: any;
}

const FALLBACK_TASKS: Task[] = [
  { id: 't1', title: 'Call Ahmed Al-Rashid — confirm Hyde Park viewing', due: 'Today 15:00', priority: 'high', done: false, agent: 'Sierra Bot' },
  { id: 't2', title: 'Send Uptown Cairo contract draft to Khalid (Stage-9)', due: 'Today 17:30', priority: 'high', done: false, agent: 'Stage-9' },
  { id: 't3', title: 'Follow up بالعربي with Gulf lead — Leila', due: 'Tomorrow 10:00', priority: 'med', done: false, agent: 'Leila' },
  { id: 't4', title: 'Review 23 scraped listings pending AVM pricing', due: 'Tomorrow', priority: 'med', done: false, agent: 'Curator' },
  { id: 't5', title: 'Publish weekly compound performance report', due: 'Friday', priority: 'low', done: false, agent: '—' },
  { id: 't6', title: 'Verify Madinaty B10 owner-direct listing photos', due: 'Done · Yesterday', priority: 'low', done: true, agent: 'Scribe' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: '#E63946',
  med: '#f59e0b',
  low: '#1E88D9',
};

interface Props {
  T: (k: string) => string;
  isAr: boolean;
}

export default function TasksPage({ T, isAr }: Props) {
  const [tasks, setTasks] = useState<Task[]>(FALLBACK_TASKS);
  const [view, setView] = useState<'active' | 'done'>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);

  // Real Firestore onSnapshot — falls back to demo data when empty.
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db as any, 'tasks'),
      (snap) => {
        if (!snap.empty) {
          const data: Task[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          data.sort((a, b) => {
            const at = a.createdAt?.toMillis?.() ?? 0;
            const bt = b.createdAt?.toMillis?.() ?? 0;
            return bt - at;
          });
          setTasks(data);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Tasks snapshot failed, using fallback:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const toggleDone = async (id: string, currentDone: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'tasks', id), { done: !currentDone });
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const addTask = async () => {
    if (!db || !newTaskTitle.trim()) return;
    try {
      await addDoc(collection(db as any, 'tasks'), {
        title: newTaskTitle.trim(),
        due: '',
        priority: 'med',
        done: false,
        agent: 'Manual',
        createdAt: serverTimestamp(),
      });
      setNewTaskTitle('');
      setShowNewTask(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const removeTask = async (id: string) => {
    if (!db) return;
    if (!confirm(isAr ? 'حذف هذه المهمة؟' : 'Delete this task?')) return;
    try {
      await deleteDoc(doc(db as any, 'tasks', id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const shown = useMemo(() => {
    return tasks
      .map((t, i) => ({ ...t, originalIndex: i }))
      .filter((t) => (view === 'active' ? !t.done : t.done))
      .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  }, [tasks, view, search]);

  const stats = [
    [tasks.length, isAr ? 'إجمالي المهام' : 'Total Tasks', '#1E88D9'],
    [tasks.filter((t) => t.done).length, isAr ? 'مكتملة' : 'Completed', '#34D399'],
    [1, isAr ? 'متأخرة' : 'Overdue', '#E63946'],
    [tasks.filter((t) => !t.done).length, isAr ? 'قيد التنفيذ' : 'To Do', '#00AEFF'],
  ] as const;

  return (
    <div className="fade-up space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([v, l, c], i) => (
          <div
            key={i}
            className="relative p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: c }} />
            <div className="font-mono text-2xl font-bold" style={{ color: c }}>{v}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{l}</div>
          </div>
        ))}
      </div>

      {/* Filter + search bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? 'ابحث في المهام…' : 'Search tasks…'}
          className="flex-1 min-w-[200px] px-3.5 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        {(['active', 'done'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`px-3.5 py-2 rounded-md text-[12px] font-semibold border transition-all ${
              view === k
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
            }`}
          >
            {(isAr ? (k === 'active' ? 'النشطة ' : 'الأرشيف ') : (k === 'active' ? 'Active ' : 'Archive '))}
            ({k === 'active' ? tasks.filter((t) => !t.done).length : tasks.filter((t) => t.done).length})
          </button>
        ))}
        <button
          onClick={() => setShowNewTask((s) => !s)}
          className="px-3.5 py-2 rounded-md text-[12px] font-semibold bg-[#C9A24D] text-slate-900 hover:bg-[#D4AF37] transition-all"
        >
          + {isAr ? 'مهمة جديدة' : 'New Task'}
        </button>
      </div>

      {/* New task inline form */}
      {showNewTask && (
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-[#C9A24D]/40 flex gap-2">
          <input
            autoFocus
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder={isAr ? 'عنوان المهمة...' : 'Task title...'}
            className="flex-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#C9A24D]/30"
          />
          <button
            onClick={addTask}
            className="px-4 py-2 rounded-md bg-emerald-500 text-white text-[12px] font-semibold hover:bg-emerald-600"
          >
            {isAr ? 'إضافة' : 'Add'}
          </button>
          <button
            onClick={() => setShowNewTask(false)}
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 text-[12px] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {shown.map((t, i) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i !== shown.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/60' : ''
            } hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group`}
          >
            <button
              onClick={() => toggleDone(t.id, t.done)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                t.done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
              }`}
            >
              {t.done && '✓'}
            </button>
            <div className="flex-1 min-w-0">
              <div
                className="text-[13px] font-semibold text-slate-900 dark:text-white"
                style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}
              >
                {t.title}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {t.due || '—'} · {t.agent || '—'}
              </div>
            </div>
            {t.priority && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                style={{
                  background: `${PRIORITY_COLORS[t.priority]}1a`,
                  color: PRIORITY_COLORS[t.priority],
                }}
              >
                {t.priority}
              </span>
            )}
            <button
              onClick={() => removeTask(t.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
              title={isAr ? 'حذف' : 'Delete'}
            >
              ✕
            </button>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="py-12 text-center text-[12px] text-slate-400">
            {isAr ? 'لا مهام — ابدأ بإنشاء مهمة' : 'No tasks — start by creating one'}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center text-[11px] text-slate-400">
          {isAr ? 'جاري التحميل من Firestore...' : 'Loading from Firestore...'}
        </div>
      )}
    </div>
  );
}
