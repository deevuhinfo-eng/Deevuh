'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import api from '@/lib/api';

// Inner component that uses useSearchParams — must be wrapped in Suspense
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  // Fetch CSRF token on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    }).catch(err => console.error('Failed to fetch CSRF token:', err));
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        await api.post('/auth/register', { name, email, password });
      } else {
        await api.post('/auth/login', { email, password });
      }
      
      // Basic secure redirect validation (must start with / and not //)
      if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
        router.push(redirectUrl);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);
      setError('');
      await api.post('/auth/google', { idToken: credentialResponse.credential });
      
      if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
        router.push(redirectUrl);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed';
      setError(message);
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
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-on-surface-variant)',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          {isRegistering ? 'Join the DEEVUH community' : 'Sign in to your DEEVUH account'}
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

        {/* Google Login */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed')}
            useOneTap={false}
            theme="outline"
            shape="rectangular"
            width="100%"
          />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-outline-variant)' }} />
          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
            Or continue with email
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-outline-variant)' }} />
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegistering && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                className="input"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              id="email-address"
              type="email"
              autoComplete="email"
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
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ marginTop: '8px', width: '100%', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '14px', color: 'var(--color-ruby)',
            }}
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Outer component with Suspense boundary for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-surface)',
      }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--color-on-surface-variant)' }}>
          Loading...
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
