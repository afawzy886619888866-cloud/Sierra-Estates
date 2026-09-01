'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdminPortalRole } from '@/lib/types';
import '../admin-portal.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sierra-estates.net');
  const [password, setPassword] = useState('AdminSierra2026!');
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // ── 1. Check existing session on mount ──────────────────────────────────
  useEffect(() => {
    // Check Supabase client session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              action: 'signin',
              provider: 'google',
              email: session.user.email,
              uid: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            }),
          });
          sessionStorage.setItem('sierra_admin_auth', 'true');
          localStorage.setItem('sierra_admin_auth', 'true');
        } catch (e) {}
        router.replace('/admin');
      }
    }).catch(() => {});

    // Check server session cookie
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data?.signedIn && isAdminPortalRole(data.role)) {
          try {
            sessionStorage.setItem('sierra_admin_auth', 'true');
            localStorage.setItem('sierra_admin_auth', 'true');
          } catch (e) {}
          router.replace('/admin');
        }
      })
      .catch((err) => console.warn('[LoginForm] Session verification:', err));

    // Listen for live Supabase Auth state changes (e.g., Google OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              action: 'signin',
              provider: 'google',
              email: session.user.email,
              uid: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            }),
          });
          sessionStorage.setItem('sierra_admin_auth', 'true');
          localStorage.setItem('sierra_admin_auth', 'true');
        } catch (e) {}
        router.replace('/admin');
        router.refresh();
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [router]);

  // ── 2. Password Login via Server Session & Supabase ──────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const cleanEmail = email.trim();
    const supaEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@sierra-estates.net`;

    try {
      // 1. Authenticate with Server Auth Route (Sets secure HttpOnly session cookie)
      const serverRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'signin',
          email: cleanEmail,
          password,
        }),
      });

      const serverResult = await serverRes.json().catch(() => ({}));

      // 2. Also authenticate with Supabase Auth Client in background
      let supaData: any = null;
      try {
        const res = await supabase.auth.signInWithPassword({
          email: supaEmail,
          password,
        });
        supaData = res.data;
      } catch (sErr) {
        // Server auth is primary for configured admin roles
      }

      // Check if either Server Auth or Supabase succeeded
      if ((serverRes.ok && serverResult.ok) || supaData?.session) {
        try {
          sessionStorage.setItem('sierra_admin_auth', 'true');
          localStorage.setItem('sierra_admin_auth', 'true');
        } catch (storageErr) {}

        router.replace('/admin');
        router.refresh();
        return;
      }

      throw new Error(
        serverResult?.error || 'Invalid email or password. Please verify your credentials.'
      );
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Magic Link / Passwordless Sign-In via Supabase ────────────────────
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setSuccessMsg('Check your email! A Supabase Magic Link has been sent / تم إرسال رابط الدخول لبريدك.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send Magic Link. Please try password login.');
    } finally {
      setLoading(false);
    }
  };

  // ── 4. Google Sign-In (Firebase Popup + Supabase OAuth Fallback) ─────────
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. Check if Firebase Client is available
      const { isFirebaseClientConfigured, auth } = await import('@/lib/firebase');
      if (isFirebaseClientConfigured) {
        try {
          const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const result = await signInWithPopup(auth, provider);
          const idToken = await result.user.getIdToken();
          const googleEmail = result.user.email || '';
          const googleName = result.user.displayName || '';

          const serverRes = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              action: 'signin',
              provider: 'google',
              token: idToken,
              email: googleEmail,
              name: googleName,
            }),
          });

          const serverResult = await serverRes.json().catch(() => ({}));
          if (serverRes.ok && serverResult.ok) {
            try {
              sessionStorage.setItem('sierra_admin_auth', 'true');
              localStorage.setItem('sierra_admin_auth', 'true');
            } catch (e) {}
            router.replace('/admin');
            router.refresh();
            return;
          }
        } catch (fbErr: any) {
          const code = fbErr?.code || '';
          if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
            setLoading(false);
            return;
          }
          console.warn('[LoginForm] Firebase Google sign-in fallback to Supabase:', fbErr?.message);
        }
      }

      // 2. Fallback to Supabase OAuth
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please use email & password.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(900px 600px at 85% 0%, rgba(62,207,142,.12), transparent 60%), radial-gradient(800px 500px at 15% 100%, rgba(0,174,255,.10), transparent 60%), #07111E',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(13, 24, 38, 0.75)',
          border: '1px solid rgba(62, 207, 142, 0.22)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.65), 0 0 40px rgba(62,207,142,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* ── Brand & Supabase Header ─────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(62, 207, 142, 0.12)',
              border: '1px solid rgba(62, 207, 142, 0.3)',
              marginBottom: 14,
            }}
          >
            {/* Supabase Logo SVG */}
            <svg width="15" height="15" viewBox="0 0 109 113" fill="none">
              <path
                d="M63.7076 110.284C60.848 113.885 55.0243 111.957 54.8876 107.362L52.8687 39.4974H96.533C104.918 39.4974 109.684 49.0799 104.575 55.7299L63.7076 110.284Z"
                fill="#3ECF8E"
              />
              <path
                d="M45.317 2.716C48.1766 -0.885177 54.0003 1.04306 54.137 5.63777L56.1559 73.5026H12.4916C4.10682 73.5026 -0.659359 63.9201 4.44976 57.2701L45.317 2.716Z"
                fill="#3ECF8E"
                fillOpacity="0.75"
              />
            </svg>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '.14em',
                color: '#3ECF8E',
                textTransform: 'uppercase',
              }}
            >
              Supabase Auth Engine
            </span>
          </div>

          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '.22em',
              background: 'linear-gradient(135deg, #d4af37 0%, #f5d76e 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SIERRA ESTATES 3.0
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '.16em',
              color: 'rgba(240,237,229,.42)',
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            Executive Admin & Intelligence OS
          </div>
        </div>

        {/* ── Google OAuth Button ──────────────────────────────── */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
            color: '#F0EDE5',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 20,
            transition: 'all .2s ease',
            fontFamily: 'inherit',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign In with Google (Supabase OAuth)</span>
        </button>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            color: 'rgba(240,237,229,0.3)',
            fontSize: 11,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span>OR / أو باستخدام البريد</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* ── Mode Switcher (Password vs Magic Link) ──────────── */}
        <div
          style={{
            display: 'flex',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.3)',
            padding: 3,
            marginBottom: 20,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => { setIsMagicLink(false); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 8,
              border: 'none',
              background: !isMagicLink ? 'rgba(62,207,142,0.18)' : 'transparent',
              color: !isMagicLink ? '#3ECF8E' : 'rgba(240,237,229,0.5)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .2s ease',
            }}
          >
            Password / كلمة المرور
          </button>
          <button
            type="button"
            onClick={() => { setIsMagicLink(true); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 8,
              border: 'none',
              background: isMagicLink ? 'rgba(62,207,142,0.18)' : 'transparent',
              color: isMagicLink ? '#3ECF8E' : 'rgba(240,237,229,0.5)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .2s ease',
            }}
          >
            Magic Link / رابط سحري
          </button>
        </div>

        {/* ── Main Form ───────────────────────────────────────── */}
        <form onSubmit={isMagicLink ? handleMagicLinkSubmit : handlePasswordSubmit}>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '.15em',
              textTransform: 'uppercase',
              color: 'rgba(240,237,229,.58)',
              marginBottom: 6,
            }}
          >
            Username or Email / اسم المستخدم أو البريد الإلكتروني
          </label>
          <input
            className="f-in"
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@sierra-estates.net or admin"
            required
            style={{
              marginBottom: isMagicLink ? 20 : 16,
              color: '#F0EDE5',
              border: '1px solid rgba(62,207,142,0.2)',
              background: 'rgba(0,0,0,0.25)',
            }}
          />

          {!isMagicLink && (
            <>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(240,237,229,.58)',
                  marginBottom: 6,
                }}
              >
                Password / كلمة المرور
              </label>
              <input
                className="f-in"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  marginBottom: 20,
                  color: '#F0EDE5',
                  border: '1px solid rgba(62,207,142,0.2)',
                  background: 'rgba(0,0,0,0.25)',
                }}
              />
            </>
          )}

          {error && (
            <div
              style={{
                color: '#FF6B6B',
                fontSize: 12,
                marginBottom: 16,
                textAlign: 'center',
                background: 'rgba(255,107,107,0.12)',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,107,107,0.25)',
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                color: '#3ECF8E',
                fontSize: 12,
                marginBottom: 16,
                textAlign: 'center',
                background: 'rgba(62,207,142,0.12)',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(62,207,142,0.25)',
              }}
            >
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #3ECF8E 0%, #00AEFF 100%)',
              color: '#071422',
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 15px rgba(62,207,142,0.25)',
            }}
          >
            {loading
              ? 'Authenticating… / جاري التحقق'
              : isMagicLink
              ? 'Send Magic Link / إرسال الرابط'
              : 'Sign In via Supabase / تسجيل الدخول'}
          </button>

          <p
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: 'rgba(240,237,229,.32)',
              marginTop: 18,
            }}
          >
            Secured by Supabase Row-Level Security (RLS) & JWT.
          </p>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setIsMagicLink(false);
                setEmail('admin@sierra-estates.net');
                setPassword('AdminSierra2026!');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3ECF8E',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              ✦ Quick Fill Executive Admin (AdminSierra2026!)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
