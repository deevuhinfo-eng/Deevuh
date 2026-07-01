'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: '◈' },
  { label: 'Products', href: '/admin/products', icon: '◆' },
  { label: 'Orders', href: '/admin/orders', icon: '◇' },
  { label: 'Customers', href: '/admin/customers', icon: '◎' },
  { label: 'Abandoned Carts', href: '/admin/abandoned-carts', icon: '◌' },
  { label: 'Coupons', href: '/admin/coupons', icon: '◐' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙' },
  { label: 'Analytics', href: '/admin/analytics', icon: '◑' },
  { label: 'Uploads', href: '/admin/uploads', icon: '◒' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Defense-in-depth: verify ADMIN role on the client side
    // (middleware already checks for cookie presence, this checks the role)
    const verifyAdmin = async () => {
      try {
        const response = await api.get<{ status: string; data: { email: string; role: string } }>('/auth/me');
        if (response?.data?.role !== 'ADMIN') {
          // User is logged in but not an admin
          router.replace('/dashboard');
          return;
        }
        setAdminEmail(response.data.email);
      } catch {
        // Not authenticated
        router.replace('/login?redirect=/admin');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdmin();
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  if (isVerifying) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-surface)',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          color: 'var(--color-on-surface-variant)',
          letterSpacing: '0.05em',
        }}>
          Verifying access...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
      }}>
        {/* Brand */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(253, 240, 213, 0.1)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-cream)',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            DEEVUH
          </h2>
          <span className="label-md" style={{ color: 'rgba(253, 240, 213, 0.5)', marginTop: '4px', display: 'block' }}>
            Admin Console
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-cream)' : 'rgba(253, 240, 213, 0.6)',
                  backgroundColor: isActive ? 'var(--color-ruby)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '3px solid var(--color-cream)' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer with logout */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(253, 240, 213, 0.1)',
        }}>
          {adminEmail && (
            <div style={{
              fontSize: '12px',
              color: 'rgba(253, 240, 213, 0.5)',
              marginBottom: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {adminEmail}
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(253, 240, 213, 0.2)',
              color: 'rgba(253, 240, 213, 0.6)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(253, 240, 213, 0.1)';
              e.currentTarget.style.color = 'var(--color-cream)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(253, 240, 213, 0.6)';
            }}
          >
            Logout
          </button>
          <div style={{
            fontSize: '11px',
            color: 'rgba(253, 240, 213, 0.3)',
            marginTop: '8px',
          }}>
            DEEVUH V3 &middot; Admin
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-content" style={{ padding: '32px' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-outline-variant)',
        }}>
          <div>
            <span className="label-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Welcome back, Admin
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-ruby)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              A
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
