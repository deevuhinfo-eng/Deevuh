'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.message || 'If this email is registered, we have sent a password reset link.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-surface)',
      padding: '40px 24px',
    }}>
      {/* Nav */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(252, 249, 248, 0.85)',
        borderBottom: '1px solid var(--color-outline-variant)',
      }}>
        <a href="/" style={{
          fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700,
          color: 'var(--color-ruby)', textDecoration: 'none', letterSpacing: '0.15em',
        }}>
          DEEVUH
        </a>
      </div>

      <div style={{
        width: '100%', maxWidth: '440px',
        backgroundColor: 'var(--color-surface-container-low)',
        border: '1px solid var(--color-outline-variant)',
        padding: '48px',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--color-charcoal)',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Forgot Password
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-on-surface-variant)',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          Enter your email address to request a secure password reset link.
        </p>

        {error && (
          <div style={{
            backgroundColor: 'var(--color-error-container)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
            border: '1px solid var(--color-success)',
            color: 'var(--color-success)',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              id="email-address"
              type="email"
              required
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ marginTop: '8px', width: '100%', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a
            href="/login"
            style={{
              fontSize: '14px',
              color: 'var(--color-ruby)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
