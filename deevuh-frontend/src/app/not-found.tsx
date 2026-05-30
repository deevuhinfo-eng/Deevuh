import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      backgroundColor: 'var(--color-surface)',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '120px',
        fontWeight: 700,
        color: 'var(--color-ruby)',
        lineHeight: 1,
        opacity: 0.15,
        userSelect: 'none',
        marginBottom: '-16px',
      }}>
        404
      </div>
      
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '36px',
        fontWeight: 600,
        color: 'var(--color-charcoal)',
        marginBottom: '16px',
        letterSpacing: '-0.01em',
      }}>
        Page Not Found
      </h1>
      
      <p style={{
        fontSize: '16px',
        color: 'var(--color-on-surface-variant)',
        maxWidth: '400px',
        marginBottom: '40px',
        lineHeight: 1.6,
      }}>
        The page you&apos;re looking for has moved or doesn&apos;t exist.
        Return to the collection.
      </p>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
        <Link href="/products" className="btn btn-secondary">
          Browse Collection
        </Link>
      </div>
      
      <div style={{
        marginTop: '80px',
        fontFamily: 'var(--font-serif)',
        fontSize: '14px',
        color: 'var(--color-outline)',
        letterSpacing: '0.1em',
      }}>
        DEEVUH — Where Divine Meets Contemporary
      </div>
    </div>
  );
}
