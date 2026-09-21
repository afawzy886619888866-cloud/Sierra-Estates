'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdminPortalRole } from '@/lib/types';
import '../admin-portal.css';

interface LoginTranslations {
  brand: string;
  subhead: string;
  authBadge: string;
  googleBtn: string;
  divider: string;
  tabCredentialsTitle: string;
  tabMagic: string;
  emailLabel: string;
  emailPlaceholder: string;
  passLabel: string;
  passPlaceholder: string;
  showPass: string;
  hidePass: string;
  rememberMe: string;
  defaultPassNotice: string;
  constantTimeVerified: string;
  submitBtn: string;
  submitMagicBtn: string;
  authenticating: string;
  backToSite: string;
  magicLinkSent: string;
  secBadgeTls: string;
  secBadgeRls: string;
  secBadgeEdge: string;
}

const T_EN: LoginTranslations = {
  brand: 'SIERRA ESTATES 3.0',
  subhead: 'Executive Admin & Intelligence OS',
  authBadge: 'Supabase Auth Engine',
  googleBtn: 'Sign In with Google',
  divider: 'OR CONTINUE WITH CREDENTIALS',
  tabCredentialsTitle: 'Password Sign-In',
  tabMagic: 'Magic Link OTP',
  emailLabel: 'Executive Email or ID',
  emailPlaceholder: 'admin@sierra-estates.net or admin',
  passLabel: 'Password',
  passPlaceholder: '••••••••••••',
  showPass: 'Show',
  hidePass: 'Hide',
  rememberMe: 'Remember this workstation',
  defaultPassNotice: 'Operator-configured key:',
  constantTimeVerified: 'Constant-Time Verified',
  submitBtn: 'Sign In to Executive OS',
  submitMagicBtn: 'Send One-Time Magic Link',
  authenticating: 'Authenticating Sovereign Session…',
  backToSite: '← Return to Sierra Estates',
  magicLinkSent: 'Check your email! A Supabase Magic Link has been dispatched to your inbox.',
  secBadgeTls: 'TLS 1.3 / AES-256',
  secBadgeRls: 'Supabase RLS Protected',
  secBadgeEdge: 'Vercel Edge Guard',
};

const T_AR: LoginTranslations = {
  brand: 'سييرا العقارية ٣.٠',
  subhead: 'نظام الاستخبارات والإدارة التنفيذية',
  authBadge: 'محرك مصادقة سوبابيز',
  googleBtn: 'تسجيل الدخول عبر Google',
  divider: 'أو المتابعة ببيانات الدخول المعتمدة',
  tabCredentialsTitle: 'كلمة المرور',
  tabMagic: 'رابط الدخول السريع',
  emailLabel: 'البريد التنفيذي أو المعرف',
  emailPlaceholder: 'admin@sierra-estates.net أو admin',
  passLabel: 'كلمة المرور',
  passPlaceholder: '••••••••••••',
  showPass: 'إظهار',
  hidePass: 'إخفاء',
  rememberMe: 'تذكّر مساحة العمل هذه',
  defaultPassNotice: 'مفتاح المشغّل المُهيّأ:',
  constantTimeVerified: 'فحص زمني مؤمّن',
  submitBtn: 'دخول نظام الاستخبارات',
  submitMagicBtn: 'إرسال رابط الدخول السحري',
  authenticating: 'جاري تأكيد الجلسة السيادية…',
  backToSite: '← العودة للموقع العام',
  magicLinkSent: 'تم الإرسال بنجاح! تفقد بريدك الإلكتروني لفتح رابط الدخول المباشر.',
  secBadgeTls: 'تشفير TLS 1.3 / AES-256',
  secBadgeRls: 'حماية RLS من سوبابيز',
  secBadgeEdge: 'حماية Edge Proxy',
};

async function createAdminSession(session: { access_token: string; user: { email?: string; id: string; user_metadata?: { full_name?: string } } }, provider: string) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      action: 'signin',
      provider,
      token: session.access_token,
      email: session.user.email,
      uid: session.user.id,
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || 'Your account is not approved for the admin portal.');
  }
}

export default function LoginForm() {
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [email, setEmail] = useState('admin@sierra-estates.net');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const t = lang === 'ar' ? T_AR : T_EN;
  const isAr = lang === 'ar';

  // ── 1. Hydrate saved language & remember-me state on mount ───────────────
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('sierra_admin_login_lang') as 'en' | 'ar' | null;
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang);
      }
      const remembered = localStorage.getItem('sierra_admin_remember_email');
      if (remembered) {
        setEmail(remembered);
      }
    } catch (_storageErr) {}
  }, []);

  const handleLangToggle = (nextLang: 'en' | 'ar') => {
    setLang(nextLang);
    try {
      localStorage.setItem('sierra_admin_login_lang', nextLang);
    } catch (_storageErr) {}
  };

  // ── 2. Check existing session on mount ──────────────────────────────────
  useEffect(() => {
    // Check Supabase client session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          await createAdminSession(session, 'supabase');
          router.replace('/admin');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to establish the admin session.');
        }
      }
    }).catch(() => {});

    // Check server session cookie
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data?.signedIn && isAdminPortalRole(data.role)) {
          router.replace('/admin');
        }
      })
      .catch((err) => console.warn('[LoginForm] Session verification:', err));

    // Listen for live Supabase Auth state changes (e.g., Google OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          await createAdminSession(session, 'google');
          router.replace('/admin');
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to establish the admin session.');
          setLoading(false);
        }
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [router]);

  // ── 3. Password Login via Server Session & Supabase ──────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const cleanEmail = email.trim();
    const supaEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@sierra-estates.net`;

    try {
      if (rememberMe) {
        try {
          localStorage.setItem('sierra_admin_remember_email', cleanEmail);
        } catch (_storageErr) {}
      } else {
        try {
          localStorage.removeItem('sierra_admin_remember_email');
        } catch (_storageErr) {}
      }

      // 1. Authenticate with Supabase Auth Client in background if possible
      let supaToken: string | undefined = undefined;
      try {
        const res = await supabase.auth.signInWithPassword({
          email: supaEmail,
          password,
        });
        if (res.data?.session?.access_token) {
          supaToken = res.data.session.access_token;
        }
      } catch (_sErr) {
        // Fallback to server bootstrap auth
      }

      // 2. Authenticate with Server Auth Route (Sets secure HttpOnly session cookie)
      const serverRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'signin',
          email: cleanEmail,
          password,
          token: supaToken,
        }),
      });

      const serverResult = await serverRes.json().catch(() => ({}));

      // Check if Server Auth succeeded
      if (serverRes.ok && serverResult.ok) {
        router.replace('/admin');
        router.refresh();
        return;
      }

      throw new Error(
        serverResult?.error || (isAr ? 'بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.' : 'Invalid email or password. Please verify your credentials.')
      );
    } catch (err: any) {
      setError(err?.message || (isAr ? 'فشلت عملية التحقق. يرجى المحاولة مرة أخرى.' : 'Authentication failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  // ── 4. Magic Link / Passwordless Sign-In via Supabase ────────────────────
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

      setSuccessMsg(t.magicLinkSent);
    } catch (err: any) {
      setError(err?.message || (isAr ? 'تعذر إرسال رابط الدخول. يرجى استخدام كلمة المرور.' : 'Failed to send Magic Link. Please try password login.'));
    } finally {
      setLoading(false);
    }
  };

  // ── 5. Google Sign-In (Supabase OAuth) ───────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
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
      setError(err?.message || (isAr ? 'فشل تسجيل الدخول عبر Google. يرجى استخدام البريد وكلمة المرور.' : 'Google sign-in failed. Please use email & password.'));
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(1000px 700px at 85% 5%, rgba(62,207,142,.14), transparent 60%), radial-gradient(900px 600px at 15% 95%, rgba(0,174,255,.12), transparent 60%), #050E18',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background decoration */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(212,175,55,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(11, 22, 35, 0.82)',
          border: '1px solid rgba(62, 207, 142, 0.26)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow:
            '0 30px 70px rgba(0,0,0,0.75), 0 0 50px rgba(62,207,142,0.08), inset 0 1px 1px rgba(255,255,255,0.1)',
          backdropFilter: 'blur(24px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ── Top Utility Row: Back Link & Language Switcher ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(240,237,229,0.55)',
              textDecoration: 'none',
              transition: 'color .2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            className="hover:text-emerald-400"
          >
            {t.backToSite}
          </Link>

          {/* Bilingual Language Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.35)',
              padding: 2,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => handleLangToggle('en')}
              style={{
                padding: '3px 10px',
                borderRadius: 10,
                border: 'none',
                background: lang === 'en' ? 'rgba(62,207,142,0.25)' : 'transparent',
                color: lang === 'en' ? '#3ECF8E' : 'rgba(240,237,229,0.45)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLangToggle('ar')}
              style={{
                padding: '3px 10px',
                borderRadius: 10,
                border: 'none',
                background: lang === 'ar' ? 'rgba(62,207,142,0.25)' : 'transparent',
                color: lang === 'ar' ? '#3ECF8E' : 'rgba(240,237,229,0.45)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              عربي
            </button>
          </div>
        </div>

        {/* ── Official Brand Logo with Gold Glow ───────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 5,
              borderRadius: 20,
              background:
                'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(62,207,142,0.35), rgba(0,174,255,0.25))',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.15)',
              marginBottom: 12,
            }}
          >
            <Image
              src="/assets/sierra-estates-official-logo.png"
              alt="Sierra Estates Official Emblem"
              width={70}
              height={70}
              priority
              style={{
                borderRadius: 16,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* ── Brand & Supabase Header ─────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(62, 207, 142, 0.12)',
              border: '1px solid rgba(62, 207, 142, 0.3)',
              marginBottom: 12,
            }}
          >
            {/* Supabase Logo SVG */}
            <svg width="14" height="14" viewBox="0 0 109 113" fill="none">
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
              {t.authBadge}
            </span>
          </div>

          <div
            style={{
              fontFamily: isAr ? "'Cairo', sans-serif" : "'JetBrains Mono', monospace",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: isAr ? 'normal' : '.20em',
              background: 'linear-gradient(135deg, #d4af37 0%, #f5d76e 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t.brand}
          </div>
          <div
            style={{
              fontFamily: isAr ? "'Cairo', sans-serif" : "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: isAr ? 'normal' : '.12em',
              color: 'rgba(240,237,229,.50)',
              marginTop: 4,
            }}
          >
            {t.subhead}
          </div>
        </div>

        {/* ── Google OAuth Button ──────────────────────────────── */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '11px 16px',
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
            marginBottom: 18,
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
          <span>{t.googleBtn}</span>
        </button>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
            color: 'rgba(240,237,229,0.35)',
            fontSize: 10,
            fontFamily: isAr ? "'Cairo', sans-serif" : "'JetBrains Mono', monospace",
            letterSpacing: isAr ? 'normal' : '.12em',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span>{t.divider}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* ── Mode Switcher (Password vs Magic Link) ──────────── */}
        <div
          style={{
            display: 'flex',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.35)',
            padding: 3,
            marginBottom: 18,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => { setIsMagicLink(false); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 9,
              border: 'none',
              background: !isMagicLink ? 'rgba(62,207,142,0.2)' : 'transparent',
              color: !isMagicLink ? '#3ECF8E' : 'rgba(240,237,229,0.5)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .2s ease',
              fontFamily: 'inherit',
            }}
          >
            {t.tabCredentialsTitle}
          </button>
          <button
            type="button"
            onClick={() => { setIsMagicLink(true); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 9,
              border: 'none',
              background: isMagicLink ? 'rgba(62,207,142,0.2)' : 'transparent',
              color: isMagicLink ? '#3ECF8E' : 'rgba(240,237,229,0.5)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .2s ease',
              fontFamily: 'inherit',
            }}
          >
            {t.tabMagic}
          </button>
        </div>

        {/* ── Main Form ───────────────────────────────────────── */}
        <form onSubmit={isMagicLink ? handleMagicLinkSubmit : handlePasswordSubmit}>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: isAr ? 'normal' : '.15em',
              textTransform: 'uppercase',
              color: 'rgba(240,237,229,.65)',
              marginBottom: 6,
              fontFamily: isAr ? "'Cairo', sans-serif" : 'inherit',
            }}
          >
            {t.emailLabel}
          </label>
          <input
            className="f-in"
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            required
            style={{
              marginBottom: isMagicLink ? 18 : 14,
              color: '#F0EDE5',
              border: '1px solid rgba(62,207,142,0.24)',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              width: '100%',
              boxSizing: 'border-box',
              fontSize: 13,
            }}
          />

          {!isMagicLink && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: isAr ? 'normal' : '.15em',
                    textTransform: 'uppercase',
                    color: 'rgba(240,237,229,.65)',
                    fontFamily: isAr ? "'Cairo', sans-serif" : 'inherit',
                  }}
                >
                  {t.passLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3ECF8E',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {showPassword ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                      <span>{t.hidePass}</span>
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>{t.showPass}</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  className="f-in"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passPlaceholder}
                  required
                  style={{
                    marginBottom: 0,
                    paddingInlineEnd: 42,
                    color: '#F0EDE5',
                    border: '1px solid rgba(62,207,142,0.24)',
                    background: 'rgba(0,0,0,0.3)',
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t.hidePass : t.showPass}
                  title={showPassword ? t.hidePass : t.showPass}
                  style={{
                    position: 'absolute',
                    [isAr ? 'left' : 'right']: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: showPassword ? '#3ECF8E' : 'rgba(240,237,229,0.45)',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* ── Workstation Persistence & Default Notice ── */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'rgba(240,237,229,0.5)',
                  marginBottom: 16,
                  padding: '2px 0',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#3ECF8E', cursor: 'pointer' }}
                  />
                  <span>{t.rememberMe}</span>
                </label>

                <span style={{ color: '#3ECF8E', fontFamily: 'monospace', fontSize: 10 }}>
                  {t.constantTimeVerified}
                </span>
              </div>
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
              padding: '13px 0',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #3ECF8E 0%, #C8961A 100%)',
              color: '#071422',
              fontWeight: 800,
              fontSize: 13,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 6px 20px rgba(62,207,142,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform .15s ease, box-shadow .15s ease',
            }}
          >
            {loading ? (
              <>
                <svg
                  style={{ animation: 'spin 1s linear infinite' }}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <span>{t.authenticating}</span>
              </>
            ) : isMagicLink ? (
              t.submitMagicBtn
            ) : (
              t.submitBtn
            )}
          </button>

          {/* ── Security Trust Badges ────────────────────────── */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              fontSize: 9.5,
              color: 'rgba(240,237,229,0.38)',
              fontFamily: isAr ? "'Cairo', sans-serif" : "'JetBrains Mono', monospace",
            }}
          >
            <span>🔒 {t.secBadgeTls}</span>
            <span>•</span>
            <span>🛡 {t.secBadgeRls}</span>
            <span>•</span>
            <span>⚡ {t.secBadgeEdge}</span>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
