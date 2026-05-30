'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: string;
  minPurchase: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  _count?: { orders: number };
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCoupons = async () => {
    try {
      const res: any = await api.get('/coupons');
      setCoupons(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setExpiresAt('');
    setMinPurchase('');
    setMaxUses('');
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      expiresAt: new Date(expiresAt).toISOString(),
      minPurchase: minPurchase ? Number(minPurchase) : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
    };

    try {
      if (editId) {
        await api.put(`/coupons/${editId}`, payload);
      } else {
        await api.post('/coupons/create', payload);
      }
      resetForm();
      fetchCoupons();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setCode(coupon.code);
    setDiscountType(coupon.discountType as 'percentage' | 'flat');
    setDiscountValue(String(coupon.discountValue));
    setExpiresAt(coupon.expiresAt.slice(0, 16));
    setMinPurchase(coupon.minPurchase ? String(coupon.minPurchase) : '');
    setMaxUses(coupon.maxUses ? String(coupon.maxUses) : '');
    setEditId(coupon.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0' }}>
        <div style={{ color: 'var(--color-on-surface-variant)' }}>Loading coupons...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 600, marginBottom: '8px' }}>Coupons</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px' }}>
            Manage discount codes and promotional offers
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
        >
          {showForm ? 'Cancel' : '+ New Coupon'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-elevated"
          style={{ marginBottom: '32px', padding: '24px' }}
        >
          <h3 style={{ marginBottom: '24px' }}>
            {editId ? 'Edit Coupon' : 'Create New Coupon'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="stack-sm">
              <label className="label-md">Coupon Code</label>
              <input
                className="input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. WELCOME10"
                required
              />
            </div>

            <div className="stack-sm">
              <label className="label-md">Discount Type</label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '44px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="discountType"
                    value="percentage"
                    checked={discountType === 'percentage'}
                    onChange={() => setDiscountType('percentage')}
                    style={{ accentColor: 'var(--color-ruby)' }}
                  />
                  Percentage (%)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="discountType"
                    value="flat"
                    checked={discountType === 'flat'}
                    onChange={() => setDiscountType('flat')}
                    style={{ accentColor: 'var(--color-ruby)' }}
                  />
                  Flat (₹)
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="stack-sm">
              <label className="label-md">
                {discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'}
              </label>
              <input
                className="input"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '500'}
                required
              />
            </div>

            <div className="stack-sm">
              <label className="label-md">Expires At</label>
              <input
                className="input"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
              />
            </div>

            <div className="stack-sm">
              <label className="label-md">Min Purchase (₹)</label>
              <input
                className="input"
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="stack-sm">
              <label className="label-md">Max Uses</label>
              <input
                className="input"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (editId ? 'Update Coupon' : 'Create Coupon')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Coupons Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min Purchase</th>
              <th>Uses</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length > 0 ? coupons.map((coupon) => {
              const isExpired = new Date(coupon.expiresAt) < new Date();
              return (
                <tr key={coupon.id}>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: 'var(--color-cream)',
                      padding: '4px 8px',
                      letterSpacing: '0.05em',
                    }}>
                      {coupon.code}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{coupon.discountType}</td>
                  <td style={{ fontWeight: 600 }}>
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}%`
                      : `₹${Number(coupon.discountValue).toLocaleString('en-IN')}`}
                  </td>
                  <td>
                    {coupon.minPurchase
                      ? `₹${Number(coupon.minPurchase).toLocaleString('en-IN')}`
                      : '—'}
                  </td>
                  <td>
                    {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ' / ∞'}
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {new Date(coupon.expiresAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    {isExpired ? (
                      <span className="badge badge-error">Expired</span>
                    ) : coupon.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-warning">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(coupon)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--color-error-container)', color: 'var(--color-error)' }}
                        onClick={() => handleDelete(coupon.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '32px' }}>
                  No coupons created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
