'use client';

/**
 * Supabase quickstart — per-user team task board (end-to-end demo).
 *
 * Hardened version: the public.todos table is now protected by row-level
 * security scoped to auth.uid() on every operation, and a before-insert
 * trigger stamps the owning user. The board therefore requires a Supabase
 * Auth session: anonymous visitors get a sign-in card, while signed-in
 * members see only their own tasks through the cookie-based @supabase/ssr
 * client from `utils/supabase/client`. Postgres itself enforces the tenant
 * boundary — the client never filters and never sends user_id.
 *
 * Auth surface: email + password (sign-in, plus sign-up with an email
 * confirmation notice, since the project requires confirmed addresses).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Database,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
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

type AuthMode = 'signin' | 'signup' | 'confirm-pending';

const byStatusThenId = (a: Todo, b: Todo) =>
  Number(a.is_complete) - Number(b.is_complete) || a.id - b.id;

const friendlyAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed'))
    return 'This email is not confirmed yet — please check your inbox first.';
  if (m.includes('already registered'))
    return 'An account with this email already exists — try signing in instead.';
  if (m.includes('at least 6 characters'))
    return 'Password must be at least 6 characters long.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts in a short time — please wait a minute and try again.';
  return message;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 11,
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--ink)',
  fontSize: 14.5,
  fontFamily: 'inherit',
  outline: 'none',
};

export default function TodosBoard() {
  // One cookie-based browser client per board, created lazily so nothing
  // touches createBrowserClient during the server-side prerender pass.
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  // ── Auth state ─────────────────────────────────────────────
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Board state ────────────────────────────────────────────
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const client = getClient();
    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? { email: data.session.user.email ?? '' } : null);
      setAuthLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? '' } : null);
      if (!session) {
        setTodos([]);
        setRealtimeOn(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [getClient]);

  const fetchTodos = useCallback(
    async (silent = false) => {
      if (!user) return;
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
    },
    [getClient, user],
  );

  // Load + realtime only while signed in. RLS means the channel and the
  // REST reads only ever see rows owned by the signed-in member.
  useEffect(() => {
    if (!user) return;
    void fetchTodos();
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
  }, [user, getClient, fetchTodos]);

  // ── Auth actions ───────────────────────────────────────────
  const submitAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await getClient().auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        // Project requires confirmed addresses (mailer_autoconfirm off):
        // show the check-your-inbox notice instead of an instant session.
        setMode('confirm-pending');
        setPassword('');
      } else {
        const { error: signInError } = await getClient().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        setPassword('');
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? friendlyAuthError(err.message) : 'Authentication failed.',
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    await getClient().auth.signOut();
    setEmail('');
    setPassword('');
    setAuthError(null);
    setMode('signin');
  };

  // ── Board actions (unchanged CRUD, now RLS-scoped) ──────────
  const addTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const task = newTask.trim();
    if (!task || adding) return;
    setAdding(true);
    setError(null);
    try {
      // user_id is stamped by the todos_set_user_id trigger server-side.
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

  const badgeStyle: React.CSSProperties = {
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
  };

  const cardStyle: React.CSSProperties = {
    padding: '18px 20px',
    borderRadius: 14,
    border: '1px solid var(--line)',
    background: 'var(--surface)',
  };

  // ── Sign-in card ───────────────────────────────────────────
  if (authLoading) {
    return (
      <SiteShell>
        <section className="wrap" style={{ paddingTop: 120, paddingBottom: 120 }}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 12, color: 'var(--muted)' }}>
            <Loader2 size={22} className="todos-spin" />
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Checking your session…</span>
          </div>
        </section>
      </SiteShell>
    );
  }

  if (!user) {
    return (
      <SiteShell>
        <style>{`
          @keyframes todos-spin { to { transform: rotate(360deg); } }
          @keyframes todos-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
          .todos-spin { animation: todos-spin 1s linear infinite; }
        `}</style>
        <section
          className="wrap"
          style={{
            paddingTop: 72,
            paddingBottom: 120,
            maxWidth: 620,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <div
            style={{
              padding: '30px 28px 26px',
              borderRadius: 20,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              boxShadow: '0 18px 48px rgba(13,33,54,.08)',
            }}
          >
            <span style={badgeStyle}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: 'var(--gold)',
                  animation: 'todos-pulse 1.6s ease-in-out infinite',
                  display: 'inline-block',
                }}
              />
              MEMBERS ONLY · SUPABASE AUTH
            </span>
            <h1
              style={{
                fontSize: 'clamp(26px, 3.4vw, 36px)',
                fontFamily: 'var(--display)',
                color: 'var(--ink)',
                margin: '14px 0 10px',
                lineHeight: 1.1,
              }}
            >
              Team Task Board
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.7, margin: '0 0 22px' }}>
              This board is protected by row-level security: every task is scoped to its owner in
              Postgres, so members sign in to view and manage their own workspace. Sign in with
              your Sierra Estates account, or create one below.
            </p>

            {mode === 'confirm-pending' ? (
              <div style={{ ...cardStyle, textAlign: 'center', marginBottom: 18 }}>
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    gap: 10,
                    padding: '14px 0 4px',
                  }}
                >
                  <Mail size={26} style={{ color: 'var(--gold)' }} />
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--ink)',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Check your inbox
                  </p>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.65 }}>
                    We sent a confirmation link to <b>{email.trim()}</b>. Confirm your email
                    address, then sign in below to open your task board.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    style={{
                      marginTop: 6,
                      padding: '9px 18px',
                      borderRadius: 10,
                      border: '1px solid rgba(184,144,71,.4)',
                      background: 'transparent',
                      color: 'var(--gold)',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'inline-flex',
                    gap: 4,
                    padding: 4,
                    borderRadius: 11,
                    border: '1px solid var(--line)',
                    marginBottom: 18,
                  }}
                >
                  {(
                    [
                      ['signin', 'Sign in'],
                      ['signup', 'Create account'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setMode(value);
                        setAuthError(null);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: mode === value ? 'var(--gold)' : 'transparent',
                        color: mode === value ? '#0d2136' : 'var(--muted)',
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={submitAuth} style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em' }}
                    >
                      EMAIL
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@sierra-estates.net"
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em' }}
                    >
                      PASSWORD
                    </span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                      style={inputStyle}
                    />
                  </label>

                  {authError && (
                    <div
                      role="alert"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(220,38,38,.28)',
                        background: 'rgba(220,38,38,.07)',
                        color: '#b91c1c',
                        fontSize: 13.5,
                        fontWeight: 600,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authBusy}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '13px 22px',
                      borderRadius: 11,
                      border: 'none',
                      background: 'var(--gold)',
                      color: '#0d2136',
                      fontSize: 14.5,
                      fontWeight: 800,
                      fontFamily: 'inherit',
                      cursor: authBusy ? 'wait' : 'pointer',
                      opacity: authBusy ? 0.6 : 1,
                    }}
                  >
                    {authBusy && <Loader2 size={15} className="todos-spin" />}
                    {authBusy
                      ? 'Please wait…'
                      : mode === 'signup'
                        ? 'Create account'
                        : 'Sign in to your board'}
                  </button>
                </form>
              </>
            )}

            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
                color: 'var(--muted)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <ShieldCheck size={13} style={{ color: 'var(--gold)' }} /> RLS-scoped rows
              </span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <Database size={13} style={{ color: 'var(--gold)' }} /> Postgres-backed
              </span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <Zap size={13} style={{ color: 'var(--gold)' }} /> Realtime sync
              </span>
            </div>
          </div>
        </section>
      </SiteShell>
    );
  }

  // ── Signed-in board ────────────────────────────────────────
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
            <span style={badgeStyle}>
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
              LIVE · YOUR TASKS · SUPABASE POSTGRES
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
              Every task below lives in the{' '}
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
              table, isolated to your account by row-level security — Postgres itself rejects
              anonymous and cross-account access, and a server-side trigger stamps you as the
              owner of every new task.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              ['Total', String(todos.length)],
              ['Open', String(openCount)],
              ['Done', String(doneCount)],
            ].map(([label, value]) => (
              <div
                key={label}
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
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.04em' }}
                >
                  {label.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Session bar ────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            padding: '10px 16px',
            marginBottom: 22,
            borderRadius: 12,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--ink)',
              fontSize: 13.5,
              fontWeight: 600,
              overflowWrap: 'anywhere',
            }}
          >
            <UserRound size={15} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            Signed in as {user.email || 'member'}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
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
                fontFamily: 'inherit',
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
            style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '13px 16px', fontSize: 15 }}
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
              <Loader2 size={17} className="todos-spin" /> Loading your tasks…
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
                Your board is clear — add the first task above.
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
              icon: <ShieldCheck size={16} />,
              title: 'Row-level security',
              body: 'Every policy on public.todos requires user_id = auth.uid(). Anonymous requests and other accounts are rejected by Postgres before any row is read or written.',
            },
            {
              icon: <Database size={16} />,
              title: 'Server-stamped ownership',
              body: 'A before-insert trigger sets user_id from your verified session, so the browser never asserts ownership — it is impossible to forge.',
            },
            {
              icon: <Zap size={16} />,
              title: 'Live sync',
              body: realtimeOn
                ? 'Realtime channel site-todos-live is subscribed — open a second tab on this account and watch it follow.'
                : 'Realtime socket unavailable right now; the board falls back to per-action REST reads.',
            },
          ].map((card) => (
            <div key={card.title} style={cardStyle}>
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
