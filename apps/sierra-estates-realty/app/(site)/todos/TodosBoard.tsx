'use client';

/**
 * Supabase quickstart — live team task board (end-to-end demo).
 *
 * Every operation below runs through the cookie-based @supabase/ssr browser
 * client from `utils/supabase/client` against the `public.todos` table, which
 * was provisioned with RLS enabled and realtime publication membership. The
 * board therefore demonstrates the full stack slice: browser client → PostgREST
 * → Postgres under row-level security, plus a realtime channel so two open
 * tabs stay in sync without a manual refresh.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Database,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import { createClient } from '@/utils/supabase/client';

type Todo = {
  id: number;
  task: string;
  is_complete: boolean;
  created_at: string;
  user_id: string | null;
};

const byStatusThenId = (a: Todo, b: Todo) =>
  Number(a.is_complete) - Number(b.is_complete) || a.id - b.id;

export default function TodosBoard() {
  // One browser client per board, created lazily so nothing touches
  // `createBrowserClient` during the server-side prerender pass.
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchTodos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error: fetchError } = await getClient()
        .from('todos')
        .select('*')
        .order('is_complete', { ascending: true })
        .order('id', { ascending: true });
      if (fetchError) throw fetchError;
      setTodos(((data ?? []) as Todo[]).sort(byStatusThenId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the tasks table.');
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  useEffect(() => {
    void fetchTodos();
  }, [fetchTodos]);

  // Realtime — public.todos is a member of the supabase_realtime publication,
  // so inserts/updates/deletes from any teammate tab land here instantly.
  // If the socket cannot connect, the board silently falls back to REST only.
  useEffect(() => {
    const client = getClient();
    const channel = client
      .channel('site-todos-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
        void fetchTodos(true);
      })
      .subscribe((status) => setRealtimeOn(status === 'SUBSCRIBED'));
    return () => {
      void client.removeChannel(channel);
    };
  }, [getClient, fetchTodos]);

  const addTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const task = newTask.trim();
    if (!task || adding) return;
    setAdding(true);
    setError(null);
    try {
      const { error: insertError } = await getClient().from('todos').insert({ task });
      if (insertError) throw insertError;
      setNewTask('');
      await fetchTodos(true);
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that task.');
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (todo: Todo) => {
    const next = !todo.is_complete;
    // Optimistic flip for a snappy feel; reverted wholesale on failure.
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, is_complete: next } : t)).sort(byStatusThenId),
    );
    setBusyId(todo.id);
    try {
      const { error: updateError } = await getClient()
        .from('todos')
        .update({ is_complete: next })
        .eq('id', todo.id);
      if (updateError) throw updateError;
    } catch (err) {
      setTodos((prev) =>
        prev
          .map((t) => (t.id === todo.id ? { ...t, is_complete: todo.is_complete } : t))
          .sort(byStatusThenId),
      );
      setError(err instanceof Error ? err.message : 'Could not update that task.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteTask = async (todo: Todo) => {
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    setBusyId(todo.id);
    try {
      const { error: deleteError } = await getClient().from('todos').delete().eq('id', todo.id);
      if (deleteError) throw deleteError;
    } catch (err) {
      await fetchTodos(true);
      setError(err instanceof Error ? err.message : 'Could not delete that task.');
    } finally {
      setBusyId(null);
    }
  };

  const openCount = todos.filter((t) => !t.is_complete).length;
  const doneCount = todos.length - openCount;

  const chip = (label: string, value: string): React.JSX.Element => (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 7,
        padding: '9px 14px',
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--surface)',
      }}
    >
      <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.04em' }}>
        {label.toUpperCase()}
      </span>
    </div>
  );

  return (
    <SiteShell>
      <style>{`
        @keyframes todos-spin { to { transform: rotate(360deg); } }
        @keyframes todos-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .todos-spin { animation: todos-spin 1s linear infinite; }
      `}</style>

      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 96 }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 18,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 30,
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(184,144,71,.35)',
                background: 'rgba(184,144,71,.10)',
                color: 'var(--gold)',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.08em',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: realtimeOn ? 'var(--gold)' : 'var(--muted)',
                  animation: 'todos-pulse 1.6s ease-in-out infinite',
                  display: 'inline-block',
                }}
              />
              LIVE · SUPABASE POSTGRES
            </span>
            <h1
              style={{
                fontSize: 'clamp(30px, 4vw, 44px)',
                fontFamily: 'var(--display)',
                color: 'var(--ink)',
                margin: '14px 0 10px',
                lineHeight: 1.08,
              }}
            >
              Team Task Board
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 15.5, lineHeight: 1.7, margin: 0 }}>
              The Sierra Estates Supabase quickstart, running end to end: every task lives in the{' '}
              <code
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 13,
                  padding: '2px 7px',
                  borderRadius: 6,
                  background: 'rgba(184,144,71,.10)',
                  color: 'var(--ink)',
                }}
              >
                public.todos
              </code>{' '}
              table behind row-level security. Create, complete, and delete work here — it syncs to
              Postgres instantly, across tabs, and survives full page reloads.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {chip('Total', String(todos.length))}
            {chip('Open', String(openCount))}
            {chip('Done', String(doneCount))}
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              padding: '12px 16px',
              marginBottom: 16,
              borderRadius: 12,
              border: '1px solid rgba(220,38,38,.28)',
              background: 'rgba(220,38,38,.07)',
              color: '#b91c1c',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span style={{ overflowWrap: 'anywhere' }}>{error}</span>
            <button
              type="button"
              onClick={() => void fetchTodos()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 10,
                border: '1px solid rgba(220,38,38,.35)',
                background: 'transparent',
                color: '#b91c1c',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        )}

        {/* ── Add form ───────────────────────────────────────────── */}
        <form
          onSubmit={addTask}
          style={{
            display: 'flex',
            gap: 10,
            padding: 10,
            borderRadius: 16,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            marginBottom: 22,
          }}
        >
          <input
            ref={inputRef}
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a task — e.g. Schedule the Cedar Ridge villa tour"
            maxLength={200}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '13px 16px',
              borderRadius: 11,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: 15,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={adding || !newTask.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 22px',
              borderRadius: 11,
              border: 'none',
              background: 'var(--gold)',
              color: '#0d2136',
              fontSize: 14.5,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: adding || !newTask.trim() ? 'not-allowed' : 'pointer',
              opacity: adding || !newTask.trim() ? 0.55 : 1,
            }}
          >
            {adding ? <Loader2 size={16} className="todos-spin" /> : <Plus size={16} />}
            {adding ? 'Adding…' : 'Add task'}
          </button>
        </form>

        {/* ── Task list ──────────────────────────────────────────── */}
        <div
          style={{
            borderRadius: 18,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            overflow: 'hidden',
            boxShadow: '0 18px 48px rgba(13,33,54,.08)',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '56px 20px',
                color: 'var(--muted)',
                fontSize: 14.5,
                fontWeight: 600,
              }}
            >
              <Loader2 size={17} className="todos-spin" /> Loading tasks from Supabase…
            </div>
          ) : todos.length === 0 ? (
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                gap: 8,
                padding: '56px 20px',
                textAlign: 'center',
              }}
            >
              <Sparkles size={22} style={{ color: 'var(--gold)' }} />
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14.5, fontWeight: 600 }}>
                The board is clear — add the first task above.
              </p>
            </div>
          ) : (
            todos.map((todo, idx) => (
              <div
                key={todo.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--line)',
                  opacity: busyId === todo.id ? 0.6 : 1,
                  transition: 'opacity .15s ease',
                }}
              >
                <button
                  type="button"
                  aria-label={todo.is_complete ? 'Mark as open' : 'Mark as done'}
                  onClick={() => void toggleTask(todo)}
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 999,
                    border: todo.is_complete ? 'none' : '2px solid var(--line)',
                    background: todo.is_complete ? 'var(--gold)' : 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {todo.is_complete && <Check size={13} strokeWidth={3.5} />}
                </button>
                <span
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: todo.is_complete ? 500 : 600,
                    color: todo.is_complete ? 'var(--muted)' : 'var(--ink)',
                    textDecoration: todo.is_complete ? 'line-through' : 'none',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {todo.task}
                </span>
                <button
                  type="button"
                  aria-label="Delete task"
                  onClick={() => void deleteTask(todo)}
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--muted)',
                    opacity: 0.55,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Integration facts ──────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14,
            marginTop: 26,
          }}
        >
          {[
            {
              icon: <Database size={16} />,
              title: 'Backing store',
              body: 'public.todos on the Sierra Estates Postgres project (eu-west-1), reachable through PostgREST.',
            },
            {
              icon: <ShieldCheck size={16} />,
              title: 'Row-level security',
              body: 'RLS is enabled with permissive demo policies — scope them to auth.uid() before real users arrive.',
            },
            {
              icon: <Zap size={16} />,
              title: 'Live sync',
              body: realtimeOn
                ? 'Realtime channel site-todos-live is subscribed — open a second tab and watch it follow.'
                : 'Realtime socket unavailable right now; the board falls back to per-action REST reads.',
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--gold)',
                  marginBottom: 8,
                }}
              >
                {card.icon}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '.06em',
                    color: 'var(--gold)',
                  }}
                >
                  {card.title.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.65 }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
