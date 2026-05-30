import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Return & Refund Policy — Deevuh',
  description: 'Deevuh Return & Refund Policy — 7-day returns, store credit, exchange conditions.',
};

export default function RefundPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(252, 249, 248, 0.92)',
        borderBottom: '1px solid var(--color-outline-variant)',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700,
          color: 'var(--color-ruby)', textDecoration: 'none', letterSpacing: '0.15em',
        }}>
          DEEVUH
        </Link>
        <Link href="/" style={{
          fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-on-surface-variant)', textDecoration: 'none',
        }}>
          ← Back to Home
        </Link>
      </nav>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '120px 32px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--color-ruby)', marginBottom: '16px',
          }}>
            Legal
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 600,
            color: 'var(--color-charcoal)', lineHeight: 1.2, marginBottom: '12px',
            letterSpacing: '-0.01em',
          }}>
            Return &amp; Refund Policy
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
            We want you to love what you ordered. Here&apos;s everything you need to know about returns, exchanges, and refunds.
          </p>
        </div>

        {/* Quick Summary Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
          marginBottom: '48px',
        }}>
          {[
            { label: 'Return Window', value: '7 Days', sub: 'from delivery date' },
            { label: 'Refund Method', value: 'Store Credit', sub: 'valid for 1 year' },
            { label: 'Handling Fee', value: '₹150', sub: 'deducted on return' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              padding: '20px',
              backgroundColor: 'var(--color-surface-container)',
              border: '1px solid var(--color-outline-variant)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, color: 'var(--color-ruby)', marginBottom: '4px' }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {/* Exchange Policy */}
          <div style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '36px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '10px' }}>
              Exchange Policy
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)', marginBottom: '12px' }}>
              We offer a one-time size exchange subject to product availability.
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '8px' }}>Exchange Conditions:</p>
            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Exchange requests must be raised within 7 days of delivery.',
                'Products must be unused, unwashed, and in original condition with tags intact.',
                'Only one exchange is allowed per order/product.',
                'Exchange is subject to stock availability.',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-ruby)', flexShrink: 0, marginTop: '2px' }}>●</span>
                  <span style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Return & Refund Policy */}
          <div style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '36px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '10px' }}>
              Return &amp; Refund Conditions
            </h2>
            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Return requests must be raised within 7 days of delivery.',
                'Products must be unused, unwashed, and in their original condition with tags intact.',
                'Once the returned product passes quality inspection, the refund amount will be issued as store credit after deducting ₹150 as delivery and handling charges.',
                'The store credit will remain valid for 1 year from the date of issue and can be used for future purchases on our website.',
                'Refunds will not be processed to bank accounts or original payment methods.',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-ruby)', flexShrink: 0, marginTop: '2px' }}>●</span>
                  <span style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Non-Returnable */}
          <div style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '36px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '10px' }}>
              Non-Returnable Items
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)', marginBottom: '12px' }}>
              The following items are not eligible for return or exchange:
            </p>
            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Products purchased during sale or discount offers',
                'Customized or made-to-order items',
                'Accessories (if applicable)',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-ruby)', flexShrink: 0, marginTop: '2px' }}>●</span>
                  <span style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cancellation */}
          <div style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '36px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '10px' }}>
              Cancellation Policy
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)' }}>
              Orders cannot be cancelled once the payment has been successfully completed.
            </p>
          </div>

          {/* Contact */}
          <div style={{ paddingBottom: '36px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '14px' }}>
              Need Help?
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)', marginBottom: '16px' }}>
              For any queries regarding returns or exchanges, please reach out to us:
            </p>
            <div style={{
              padding: '20px 24px',
              backgroundColor: 'var(--color-surface-container)',
              borderLeft: '3px solid var(--color-ruby)',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              {[
                { label: 'Website', value: 'deevuh.in', href: 'https://deevuh.in' },
                { label: 'Email', value: 'deevuhinfo@gmail.com', href: 'mailto:deevuhinfo@gmail.com' },
                { label: 'Phone', value: '+91 78275 37480', href: 'tel:+917827537480' },
              ].map(({ label, value, href }) => (
                <div key={label} style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-charcoal)', minWidth: '60px' }}>{label}:</span>
                  <a href={href} style={{ color: 'var(--color-ruby)', textDecoration: 'none' }}>{value}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div style={{
        borderTop: '1px solid var(--color-outline-variant)',
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--color-on-surface-variant)',
      }}>
        <Link href="/terms" style={{ color: 'var(--color-ruby)', textDecoration: 'none', marginRight: '24px' }}>Terms &amp; Conditions</Link>
        <Link href="/privacy" style={{ color: 'var(--color-ruby)', textDecoration: 'none' }}>Privacy Policy</Link>
      </div>
    </div>
  );
}
