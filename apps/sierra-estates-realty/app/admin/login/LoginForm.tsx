'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
      .catch(() => {});
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
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'rgba(255,255,255,.055)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16,
          padding: 32,
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
          Email
        </label>
        <input
          className="f-in"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@sierra-estates.net"
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
          Password
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
          {loading ? 'Signing in…' : 'Login'}
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
      </form>
    </div>
  );
}
