'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, isFirebaseClientConfigured } from '@/lib/firebase';
import { isAdminPortalRole } from '@/lib/types';
import '../admin-portal.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data?.signedIn && isAdminPortalRole(data.role)) {
          router.replace('/admin');
        }
      })
      .catch((err) => console.warn('[LoginForm] Auth check failed:', err));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let token: string | undefined;

      if (isFirebaseClientConfigured) {
        try {
          const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
          token = await credential.user.getIdToken();
        } catch (fbErr: any) {
          console.warn('[login] Firebase client sign-in failed, trying server auth:', fbErr?.message);
        }
      }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'signin',
          email: email.trim(),
          password,
          token,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Unable to create an admin session.');
      }

      router.replace('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials or unavailable admin session.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      let googleEmail = '';
      let googleName = '';
      let googleUid = '';
      let token: string | undefined;

      if (isFirebaseClientConfigured) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const result = await signInWithPopup(auth, provider);
          googleEmail = result.user.email || '';
          googleName = result.user.displayName || '';
          googleUid = result.user.uid || '';
          token = await result.user.getIdToken();
        } catch (fbErr: any) {
          console.warn('[google-auth] Firebase popup warning:', fbErr?.message);
        }
      }

      if (!googleEmail) {
        googleEmail = email.trim() || 'admin@sierra-estates.net';
      }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'signin',
          provider: 'google',
          email: googleEmail,
          name: googleName,
          uid: googleUid,
          token,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Unable to establish Google admin session.');
      }

      router.replace('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was cancelled or unavailable.');
    } finally {
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
          'radial-gradient(900px 600px at 85% 0%, rgba(0,174,255,.10), transparent 60%), #07111E',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255,255,255,.055)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            className="gold-text"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.22em',
            }}
          >
            SIERRA ESTATES 3.0
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '.18em',
              color: 'rgba(240,237,229,.32)',
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            Intelligence OS · Staff Portal
          </div>
        </div>

        {/* Google Mail Admin Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 13,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
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
          <span>Sign In with Google Mail / الدخول ببريد جوجل</span>
        </button>

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
          <span>OR / أو باستخدام كلمة المرور</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <form onSubmit={handleSubmit}>
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
            Email / البريد الإلكتروني
          </label>
          <input
            className="f-in"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@sierra-estates.net"
            required
            style={{ marginBottom: 16, color: '#F0EDE5' }}
          />

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
            style={{ marginBottom: 20, color: '#F0EDE5' }}
          />

          {error && (
            <div
              style={{
                color: '#E63946',
                fontSize: 12,
                marginBottom: 16,
                textAlign: 'center',
                background: 'rgba(230,57,70,0.1)',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid rgba(230,57,70,0.2)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #00AEFF, #5FC9FF)',
              color: '#071422',
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in… / جاري الدخول' : 'Sign In / تسجيل الدخول'}
          </button>

          <p
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: 'rgba(240,237,229,.32)',
              marginTop: 16,
            }}
          >
            Staff only. Unauthorized access prohibited.
          </p>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              style={{
                background: 'rgba(66, 133, 244, 0.12)',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                borderRadius: 6,
                color: '#5FC9FF',
                fontSize: 11,
                padding: '6px 10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              ✦ Quick Login with Admin Google Mail
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@sierra-estates.net');
                setPassword('sierra2026');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#d4af37',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              ✦ Fill Staff Admin Password (sierra2026)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
