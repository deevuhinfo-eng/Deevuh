'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an analytics service
    console.error('Unhandled Client-Side Error Boundary caught:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-charcoal)',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '480px',
        border: '1px solid var(--color-outline-variant)',
        backgroundColor: 'var(--color-surface-container-low)',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          fontSize: '48px',
          color: 'var(--color-ruby)',
          fontFamily: 'var(--font-serif)',
          fontWeight: 700
        }}>
          ◒
        </div>
        
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '24px',
          fontWeight: 600,
          margin: 0
        }}>
          Something went wrong
        </h2>
        
        <p style={{
          fontSize: '14px',
          color: 'var(--color-on-surface-variant)',
          lineHeight: 1.6,
          margin: 0
        }}>
          An unexpected error occurred while rendering this page. You can try reloading the page, or contact support if the issue persists.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          width: '100%',
          marginTop: '12px'
        }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{
              flex: 1,
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
          
          <a
            href="/"
            className="btn btn-secondary"
            style={{
              flex: 1,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
