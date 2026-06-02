import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Deevuh',
  description: 'Deevuh Terms & Conditions — Orders, pricing, shipping, exchange and return policy.',
};

const sections = [
  {
    title: '1. Orders',
    items: [
      'All orders are subject to availability and confirmation.',
      'Once an order is placed, you will receive an order confirmation through email, SMS, or WhatsApp.',
    ],
  },
  {
    title: '2. Pricing',
    items: [
      'All prices mentioned on the website are in INR.',
      'Prices may change without prior notice.',
    ],
  },
  {
    title: '3. Shipping',
    items: [
      'Delivery timelines may vary depending on your location.',
      'Delays caused by courier companies or unforeseen circumstances are beyond our control.',
    ],
  },
  {
    title: '4. Exchange Policy',
    intro: 'We offer a one-time size exchange subject to product availability.',
    subTitle: 'Exchange Conditions:',
    items: [
      'Exchange requests must be raised within 7 days of delivery.',
      'Products must be unused, unwashed, and in original condition with tags intact.',
      'Only one exchange is allowed per order/product.',
      'Exchange is subject to stock availability.',
    ],
  },
  {
    title: '5. Return & Refund Policy',
    subTitle: 'Return Conditions:',
    items: [
      'Return requests must be raised within 7 days of delivery.',
      'Products must be unused, unwashed, and in their original condition with tags intact.',
      'Once the returned product passes quality inspection, the refund amount will be issued as store credit after deducting ₹150 as delivery and handling charges.',
      'The store credit will remain valid for 1 year from the date of issue and can be used for future purchases on our website.',
      'Refunds will not be processed to bank accounts or original payment methods.',
    ],
  },
  {
    title: '6. Non-Returnable Items',
    intro: 'The following items are not eligible for return or exchange:',
    items: [
      'Products purchased during sale or discount offers',
      'Customized or made-to-order items',
      'Accessories (if applicable)',
    ],
  },
  {
    title: '7. Cancellation Policy',
    items: [
      'Orders cannot be cancelled once the payment has been successfully completed.',
    ],
  },
  {
    title: '8. Product Disclaimer',
    items: [
      'Product colors may slightly vary due to lighting and screen settings.',
      'Minor variations in fabric or color are not considered defects.',
    ],
  },
  {
    title: '9. Intellectual Property',
    body: 'All website content including images, logos, designs, graphics, and text belongs to Deevuh and may not be copied, reproduced, or used without permission.',
  },
  {
    title: '10. Contact Information',
    body: 'For any queries regarding orders, returns, or exchanges, please contact us:',
    contact: true,
  },
];

export default function TermsPage() {
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
            Terms &amp; Conditions
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
            Welcome to Deevuh (operated by **Deevuh LLP**). By placing an order with us, you agree to the following Terms &amp; Conditions. Registered Office: B-42, Vasant Vihar, New Delhi - 110057, India.
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

              {section.subTitle && (
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '8px', marginTop: '8px' }}>
                  {section.subTitle}
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

              {section.body && (
                <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--color-on-surface-variant)' }}>
                  {section.body}
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
        <Link href="/privacy" style={{ color: 'var(--color-ruby)', textDecoration: 'none', marginRight: '24px' }}>Privacy Policy</Link>
        <Link href="/refund" style={{ color: 'var(--color-ruby)', textDecoration: 'none' }}>Refund Policy</Link>
      </div>
    </div>
  );
}
