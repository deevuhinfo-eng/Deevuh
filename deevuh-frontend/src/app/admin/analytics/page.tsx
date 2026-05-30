'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface AnalyticsData {
  grossRevenue: number;
  totalPaidOrders: number;
  averageOrderValue: number;
  activeAbandonedCarts: number;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: Array<{ finalAmount: string; createdAt: string }>;
}

interface AbandonedCart {
  id: string;
  lastActivityAt: string;
  user?: { name: string; email: string; phone: string };
  items: Array<{
    quantity: number;
    variant: {
      size: string;
      price: string;
      product: { title: string };
    };
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics'),
      api.get('/admin/abandoned-carts'),
    ])
      .then(([analyticsRes, cartsRes]: any) => {
        setAnalytics(analyticsRes.data);
        setAbandonedCarts(cartsRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0' }}>
        <div style={{ color: 'var(--color-on-surface-variant)' }}>Loading analytics...</div>
      </div>
    );
  }

  const formatCurrency = (val: number | string) => {
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '36px', fontWeight: 600, marginBottom: '8px' }}>
        Analytics
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '40px', fontSize: '14px' }}>
        Revenue metrics, order performance, and cart abandonment insights
      </p>

      {/* Primary Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        marginBottom: '48px',
      }}>
        {/* GMV Card */}
        <div className="stat-card" style={{
          background: 'var(--color-cream)',
          borderColor: 'var(--color-outline-variant)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span className="stat-label">Gross Merchandise Value</span>
          <span className="stat-value" style={{ fontSize: '42px', color: 'var(--color-ruby)' }}>
            {formatCurrency(analytics?.grossRevenue || 0)}
          </span>
          <span style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            fontSize: '48px',
            opacity: 0.08,
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            color: 'var(--color-ruby)',
          }}>
            ₹
          </span>
        </div>

        {/* AOV Gauge */}
        <div className="stat-card">
          <span className="stat-label">Average Order Value</span>
          <span className="stat-value">
            {formatCurrency(analytics?.averageOrderValue || 0)}
          </span>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'var(--color-surface-container-high)',
            marginTop: '8px',
          }}>
            <div style={{
              width: `${Math.min((Number(analytics?.averageOrderValue || 0) / 5000) * 100, 100)}%`,
              height: '100%',
              background: 'var(--color-ruby)',
              transition: 'width 1s ease',
            }} />
          </div>
        </div>

        {/* Total Orders */}
        <div className="stat-card">
          <span className="stat-label">Total Paid Orders</span>
          <span className="stat-value">{analytics?.totalPaidOrders || 0}</span>
        </div>

        {/* Abandoned Carts */}
        <div className="stat-card" style={{
          borderColor: analytics?.activeAbandonedCarts
            ? 'var(--color-warning)'
            : 'var(--color-outline-variant)',
        }}>
          <span className="stat-label">Active Abandoned Carts</span>
          <span className="stat-value" style={{
            color: analytics?.activeAbandonedCarts ? 'var(--color-warning)' : 'var(--color-charcoal)',
          }}>
            {analytics?.activeAbandonedCarts || 0}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
            30-minute inactivity threshold
          </span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '48px',
      }}>
        <div className="stat-card">
          <span className="stat-label">Total Customers</span>
          <span className="stat-value" style={{ fontSize: '28px' }}>{analytics?.totalCustomers || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Products</span>
          <span className="stat-value" style={{ fontSize: '28px' }}>{analytics?.totalProducts || 0}</span>
        </div>
      </div>

      {/* Abandoned Carts Table */}
      <h3 style={{ marginBottom: '16px' }}>Abandoned Cart Details</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Items</th>
              <th>Cart Value</th>
              <th>Abandoned Since</th>
            </tr>
          </thead>
          <tbody>
            {abandonedCarts.length > 0 ? abandonedCarts.map((cart) => {
              const cartValue = cart.items.reduce(
                (sum, item) => sum + Number(item.variant.price) * item.quantity, 0
              );
              const timeSince = new Date(cart.lastActivityAt);
              const minutesAgo = Math.floor((Date.now() - timeSince.getTime()) / 60000);

              return (
                <tr key={cart.id}>
                  <td style={{ fontWeight: 500 }}>{cart.user?.name || 'Guest'}</td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{cart.user?.email || '—'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                      {cart.user?.phone || ''}
                    </div>
                  </td>
                  <td>
                    {cart.items.map((item, i) => (
                      <div key={i} style={{ fontSize: '13px' }}>
                        {item.variant.product.title} ({item.variant.size}) × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(cartValue)}</td>
                  <td>
                    <span className="badge badge-warning">
                      {minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`}
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '32px' }}>
                  No abandoned carts detected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
