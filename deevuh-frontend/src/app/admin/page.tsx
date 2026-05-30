'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface DashboardData {
  orderCount: number;
  productCount: number;
  userCount: number;
  recentOrders: Array<{
    id: string;
    finalAmount: string;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
    user?: { name: string; email: string };
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res: any) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0' }}>
        <div style={{ color: 'var(--color-on-surface-variant)' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '36px', fontWeight: 600, marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '32px', fontSize: '14px' }}>
        Overview of your DEEVUH store performance
      </p>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '48px',
      }}>
        <div className="stat-card">
          <span className="stat-label">Total Orders</span>
          <span className="stat-value">{data?.orderCount || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Products</span>
          <span className="stat-value">{data?.productCount || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Registered Users</span>
          <span className="stat-value">{data?.userCount || 0}</span>
        </div>
      </div>

      {/* Recent Orders */}
      <h3 style={{ marginBottom: '16px' }}>Recent Orders</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.recentOrders?.map((order) => (
              <tr key={order.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {order.id.slice(0, 8)}...
                </td>
                <td>{order.user?.name || 'Guest'}</td>
                <td style={{ fontWeight: 600 }}>₹{Number(order.finalAmount).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`badge ${
                    order.paymentStatus === 'SUCCESS' ? 'badge-success' :
                    order.paymentStatus === 'PENDING' ? 'badge-warning' : 'badge-error'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    order.orderStatus === 'DELIVERED' ? 'badge-success' :
                    order.orderStatus === 'CANCELLED' ? 'badge-error' : 'badge-primary'
                  }`}>
                    {order.orderStatus}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                  {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </td>
              </tr>
            )) || (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '32px' }}>
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
