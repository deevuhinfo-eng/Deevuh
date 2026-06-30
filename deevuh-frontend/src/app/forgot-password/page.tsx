'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Criteria checks
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&#.]/.test(password),
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isPasswordValid) {
      setError('Password does not meet strength requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email, password });
      setMessage(res.message || 'Your password has been successfully reset. Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCriterion = (label: string, met: boolean) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      color: met ? 'var(--color-success)' : 'var(--color-on-surface-variant)',
      transition: 'color 0.2s ease',
    }}>
      <span style={{
        fontSize: '14px',
        fontWeight: 'bold',
      }}>
        {met ? '✓' : '•'}
      </span>
      <span>{label}</span>
    </div>
  );

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
          Reset Password
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-on-surface-variant)',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          Enter your registered email and choose a secure new password.
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Criteria checklist */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backgroundColor: 'var(--color-surface-container)',
            padding: '12px 16px',
            border: '1px solid var(--color-outline-variant)',
          }}>
            {renderCriterion('At least 8 characters', criteria.length)}
            {renderCriterion('One uppercase letter (A-Z)', criteria.uppercase)}
            {renderCriterion('One lowercase letter (a-z)', criteria.lowercase)}
            {renderCriterion('One numeric digit (0-9)', criteria.number)}
            {renderCriterion('One special character (@$!%*?&#.)', criteria.special)}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              className="input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordValid || password !== confirmPassword}
            className="btn btn-primary"
            style={{
              marginTop: '8px',
              width: '100%',
              opacity: (isLoading || !isPasswordValid || password !== confirmPassword) ? 0.6 : 1,
              cursor: (isLoading || !isPasswordValid || password !== confirmPassword) ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
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
