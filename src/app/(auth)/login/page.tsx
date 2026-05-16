'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const JoolaLogo = () => (
  <svg viewBox="0 0 20 20" fill="none" style={{ width: 24, height: 24 }}>
    <polygon points="10,2 2,7 2,15 10,18 18,15 18,7" fill="black" />
    <polygon points="10,2 2,7 10,10.5 18,7" fill="rgba(255,255,255,.9)" />
    <polygon points="2,7 2,15 10,18 10,10.5" fill="rgba(255,255,255,.5)" />
    <polygon points="18,7 18,15 10,18 10,10.5" fill="rgba(255,255,255,.7)" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      setAuth(res.data.user, res.data.access_token);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '40px 44px',
          width: 420,
          maxWidth: '96vw',
          boxShadow: '0 40px 120px rgba(0,0,0,.6)',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: '#000',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <JoolaLogo />
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              color: '#000',
            }}
          >
            JOOLA
            <span style={{ color: '#999', fontWeight: 400, fontSize: 16 }}> Track</span>
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            textAlign: 'center',
            marginBottom: 5,
            letterSpacing: '-.3px',
            color: '#111110',
          }}
        >
          Sign in to JOOLA Track
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: '#8a8580',
            textAlign: 'center',
            marginBottom: 22,
          }}
        >
          KPI Lifecycle Management Platform
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 13 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#4a4640',
                marginBottom: 5,
                textTransform: 'uppercase',
                letterSpacing: '.4px',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@joola.in"
              style={{
                width: '100%',
                background: '#f8f7f5',
                border: '1.5px solid #e2dfd8',
                borderRadius: 6,
                padding: '9px 12px',
                color: '#111110',
                fontFamily: 'inherit',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color .14s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#000')}
              onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 13 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#4a4640',
                marginBottom: 5,
                textTransform: 'uppercase',
                letterSpacing: '.4px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                background: '#f8f7f5',
                border: '1.5px solid #e2dfd8',
                borderRadius: 6,
                padding: '9px 12px',
                color: '#111110',
                fontFamily: 'inherit',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color .14s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#000')}
              onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                padding: '9px 12px',
                borderRadius: 7,
                background: 'rgba(185,28,28,.08)',
                color: '#b91c1c',
                border: '1px solid rgba(185,28,28,.2)',
                marginBottom: 13,
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
              background: '#000',
              color: '#fff',
              border: '1px solid #000',
              borderRadius: 8,
              padding: '11px 14px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity .15s',
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>

      <p
        style={{
          color: '#555',
          fontSize: 11.5,
          marginTop: 22,
          textAlign: 'center',
        }}
      >
        JOOLA Track · Enterprise KPI Platform
      </p>
    </div>
  );
}
