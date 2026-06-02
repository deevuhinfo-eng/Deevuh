import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Deevuh',
  description: 'Deevuh Privacy Policy — how we collect, use, and protect your personal information.',
};

const sections = [
  {
    title: '1. Information We Collect',
    intro: 'When you use our website, place an order, or contact us, we may collect:',
    items: [
      'Full name',
      'Phone number',
      'Email address',
      'Shipping & billing address',
      'Payment information (payments are processed securely through third-party payment gateways; we do not store card details)',
      'Order history',
      'Device information such as IP address, browser type, and cookies',
    ],
  },
  {
    title: '2. How We Use Your Information',
    intro: 'We use your information to:',
    items: [
      'Process and deliver your orders',
      'Provide customer support',
      'Send order updates and tracking details',
      'Improve our website and shopping experience',
      'Prevent fraudulent or unauthorized transactions',
      'Share updates, launches, or promotional offers',
    ],
  },
  {
    title: '3. Sharing of Information',
    body: 'We do not sell or rent your personal information. Your data may only be shared with trusted third parties such as:',
    items: [
      'Payment gateways',
      'Shipping and logistics partners',
      'Website and analytics providers',
    ],
    footer: 'These parties only receive the information necessary to perform their services.',
  },
  {
    title: '4. Cookies & Tracking',
    body: 'Our website may use cookies to improve your browsing experience, remember your preferences, and analyze website traffic. You can disable cookies through your browser settings if preferred.',
  },
  {
    title: '5. Data Security',
    body: 'We take reasonable security measures to protect your personal information from unauthorized access, misuse, or disclosure. However, no method of online transmission is completely secure.',
  },
  {
    title: '6. Your Rights',
    intro: 'You may contact us anytime to:',
    items: [
      'Access your personal data',
      'Correct inaccurate information',
      'Request deletion of your data',
      'Opt out of promotional communications',
    ],
  },
  {
    title: '7. Third-Party Links',
    body: 'Our website may contain links to third-party websites. We are not responsible for the privacy practices of those websites.',
  },
  {
    title: '8. Policy Updates',
    body: 'We may update this Privacy Policy from time to time. Changes will be updated on this page.',
  },
  {
    title: '9. Contact Us',
    body: 'For any privacy-related questions, contact us at:',
    contact: true,
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
            Welcome to Deevuh (operated by **Deevuh LLP**). Your privacy is important to us, and we are committed to protecting your personal
            information. By using our website, you agree to the terms mentioned in this Privacy Policy. Registered Office: B-42, Vasant Vihar, New Delhi - 110057, India.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {sections.map((section) => (
            <div key={section.title} style={{
              borderBottom: '1px solid var(--color-outline-variant)',
              paddingBottom: '36px',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 600,
                color: 'var(--color-charcoal)', marginBottom: '14px',
              }}>
                {section.title}
              </h2>

              {section.intro && (
                <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)', marginBottom: '10px' }}>
                  {section.intro}
                </p>
              )}

              {section.body && (
                <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)', marginBottom: section.items ? '10px' : '0' }}>
                  {section.body}
                </p>
              )}

              {section.items && (
                <ul style={{ paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {section.items.map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--color-ruby)', flexShrink: 0, marginTop: '2px', fontSize: '16px', lineHeight: 1.5 }}>●</span>
                      <span style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {(section as any).footer && (
                <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--color-on-surface-variant)', marginTop: '12px' }}>
                  {(section as any).footer}
                </p>
              )}

              {section.contact && (
                <div style={{
                  marginTop: '16px', padding: '20px 24px',
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
              )}
            </div>
          ))}
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
        <Link href="/refund" style={{ color: 'var(--color-ruby)', textDecoration: 'none' }}>Refund Policy</Link>
      </div>
    </div>
  );
}
