"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import api from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartTotal, syncCartWithBackend } = useCart();

  // Auth State
  const [isVerifying, setIsVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  // Shipping Form State
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  
  // Coupon Validation States
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Order Placement States
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res?.status === 'success' && res.data) {
          setUserEmail(res.data.email);
          setShippingName(res.data.name || '');
          setShippingPhone(res.data.phone || '');
          
          // Migrate guest cart and fetch backend state
          await syncCartWithBackend();
          
          // Pre-populate address from latest order if available
          const ordersRes = await api.get('/orders');
          if (ordersRes?.status === 'success' && ordersRes.data?.length > 0) {
            setShippingAddress(ordersRes.data[0].shippingAddress || '');
            if (!res.data.phone && ordersRes.data[0].shippingPhone) {
              setShippingPhone(ordersRes.data[0].shippingPhone);
            }
          }
        } else {
          router.replace('/login?redirect=/checkout');
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
        router.replace('/login?redirect=/checkout');
      } finally {
        setIsVerifying(false);
      }
    };

    verifySession();
  }, [router]);

  // If cart is empty and we are not in success state, redirect to home
  useEffect(() => {
    if (!isVerifying && cartItems.length === 0 && !successOrder) {
      router.replace('/');
    }
  }, [cartItems, isVerifying, successOrder, router]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError('');
    try {
      // Validate coupon against backend list via POST request
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        cartTotal
      });
      if (res?.status === 'success' && res.data) {
        const { coupon, discountAmount } = res.data;
        setCouponDiscount(discountAmount);
        setAppliedCoupon(coupon.code);
        setCouponCode('');
      } else {
        setCouponError('Invalid or expired coupon code.');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Coupon code is invalid or expired.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingName.trim() || shippingPhone.trim().length < 10 || shippingAddress.trim().length < 10) {
      setError('Please provide valid shipping name, 10-digit phone number, and a full delivery address.');
      return;
    }

    setIsPlacing(true);
    setError('');

    const payload = {
      shippingName: shippingName.trim(),
      shippingPhone: shippingPhone.trim(),
      shippingAddress: shippingAddress.trim(),
      couponCode: appliedCoupon || undefined,
    };

    try {
      const res = await api.post('/checkout/create-order', payload);
      if (res?.status === 'success' && res.data) {
        const orderData = res.data;
        
        // Refresh global cart state since items are now ordered/converted
        await syncCartWithBackend();

        if (orderData.paymentMethod === 'PAYU' && orderData.paymentParams) {
          // PAYU REDIRECT: Auto-construct a hidden form and submit it programmatically
          const params = orderData.paymentParams;
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = 'https://secure.payu.in/_payment';
          
          Object.keys(params).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = params[key];
            form.appendChild(input);
          });
          
          document.body.appendChild(form);
          form.submit();
        } else {
          // COD / MANUAL MODE: Show success state directly
          setSuccessOrder(orderData);
        }
      } else {
        setError('Failed to create order transaction.');
      }
    } catch (err: any) {
      setError(err.message || 'Stock allocation or order creation failed.');
    } finally {
      setIsPlacing(false);
    }
  };

  // Pricing calculations
  const GST_RATE = 0.18;
  const afterDiscount = cartTotal - couponDiscount;
  const gst = Math.round(afterDiscount * GST_RATE * 100) / 100;
  const total = Math.round((afterDiscount + gst) * 100) / 100;

  const borderStyle = '1px solid var(--color-outline-variant)';

  if (isVerifying) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.05em' }}>
          Configuring secure checkout slates...
        </div>
      </div>
    );
  }

  // ── ORDER PLACED SUCCESS PANEL ──
  if (successOrder) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{
          width: '100%', maxWidth: '620px',
          backgroundColor: 'var(--color-surface-container-low)',
          border: borderStyle,
          padding: '48px',
          textAlign: 'center',
          animation: 'fadeUp 0.4s ease-out forwards',
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />

          <span style={{ fontSize: '56px', color: 'var(--color-ruby)', display: 'block', marginBottom: '16px' }}>✓</span>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--color-ruby)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
            Bespeaking Success
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '12px' }}>
            Your Order is Placed
          </h1>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', marginBottom: '32px', maxWidth: '440px', margin: '0 auto 32px' }}>
            We have securely reserved your signature capsule garment patterns. An editor from our tailoring team will reach out to you via WhatsApp/Email to verify custom measurements.
          </p>

          <div style={{ border: borderStyle, backgroundColor: 'var(--color-surface)', padding: '24px', textAlign: 'left', marginBottom: '32px' }}>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 600, marginBottom: '16px', borderBottom: borderStyle, paddingBottom: '12px' }}>
              Order Reference
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-on-surface-variant)' }}>Order ID</span>
                <span style={{ fontWeight: 700 }}>#{successOrder.orderId.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-on-surface-variant)' }}>Payment Method</span>
                <span style={{ fontWeight: 600 }}>{successOrder.paymentMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-on-surface-variant)' }}>Total Amount Paid</span>
                <span style={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>
                  ₹{Number(successOrder.summary?.finalAmount || total).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: borderStyle, paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: 'var(--color-on-surface-variant)' }}>Fulfillment State</span>
                <span style={{ color: 'var(--color-ruby)', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em' }}>CREATED / WAITING VERIFICATION</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link
              href="/dashboard"
              style={{
                padding: '14px 28px',
                backgroundColor: 'var(--color-charcoal)',
                color: 'var(--color-cream)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Track Order In Dashboard
            </Link>
            <Link
              href="/"
              style={{
                padding: '14px 28px',
                backgroundColor: 'transparent',
                color: 'var(--color-charcoal)',
                border: '1px solid var(--color-charcoal)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
      {/* ════════ HEADER (Minimal Compliant Layout) ════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(252, 249, 248, 0.85)',
        borderBottom: borderStyle,
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700,
          color: 'var(--color-ruby)', textDecoration: 'none', letterSpacing: '0.15em',
        }}>
          DEEVUH
        </Link>
        <Link href="/" style={{
          fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-on-surface-variant)', textDecoration: 'none',
        }}>
          ← Cancel Checkout
        </Link>
      </nav>

      {/* ════════ CHECKOUT WORKSPACE ════════ */}
      <div className="container" style={{ padding: '120px 0 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '48px', alignItems: 'start' }}>
          
          {/* LEFT: SHIPPING & BILLING details FORM */}
          <div style={{
            backgroundColor: 'var(--color-surface-container-lowest)',
            border: borderStyle,
            padding: '40px',
          }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
              Shipping Details
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '32px' }}>
              We offer complimentary express delivery and custom size alignment verification across India.
            </p>

            {error && (
              <div style={{
                backgroundColor: 'var(--color-error-container)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
                padding: '12px 16px',
                marginBottom: '24px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Receiver's name"
                  className="input"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  disabled={isPlacing}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  className="input"
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  disabled={isPlacing}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
                  Delivery Address
                </label>
                <textarea
                  required
                  placeholder="Flat/House No., Street address, Area, City, State, Pincode"
                  className="input"
                  rows={4}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  disabled={isPlacing}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{
                marginTop: '16px',
                padding: '20px',
                backgroundColor: 'var(--color-cream)',
                border: borderStyle,
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-ruby)', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>
                  SECURE COMPLIANCE DISCLOSURE
                </span>
                <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', margin: 0 }}>
                  This platform is secured by industry-grade encryption. Orders are fulfilled and processed legally by **Deevuh LLP**, B-42, Vasant Vihar, New Delhi - 110057, India. Support coordinates: `deevuhinfo@gmail.com`
                </p>
              </div>

              <button
                type="submit"
                disabled={isPlacing}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  backgroundColor: 'var(--color-ruby)',
                  color: 'var(--color-cream)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  marginTop: '12px',
                  opacity: isPlacing ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {isPlacing ? 'Allocating Inventory...' : 'Confirm Order & Pay'}
              </button>
            </form>
          </div>

          {/* RIGHT: SHOPPING BAG BREAKDOWN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Items Summary Card */}
            <div style={{
              backgroundColor: 'var(--color-surface-container-lowest)',
              border: borderStyle,
              padding: '32px',
            }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                Shopping Bag ({cartItems.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '280px', overflowY: 'auto', marginBottom: '24px' }}>
                {cartItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '12px', fontSize: '14px', alignItems: 'center' }}>
                    <img 
                      src={item.variant.product.images[0]?.imageUrl || "/products/Baby Blue Coordset/1 Picture.jpg"} 
                      alt={item.variant.product.title} 
                      style={{ width: '45px', aspectRatio: '3/4', objectFit: 'cover', border: borderStyle }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-charcoal)', display: 'block' }}>
                        {item.variant.product.title}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                        Size: {item.variant.size} | Qty: {item.quantity}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600 }}>
                      ₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon inputs */}
              <div style={{ borderTop: borderStyle, paddingTop: '20px', marginBottom: '24px' }}>
                {appliedCoupon ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(40, 167, 69, 0.08)',
                    border: '1px solid var(--color-success)',
                    padding: '8px 12px',
                    fontSize: '13px'
                  }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                      Coupon `{appliedCoupon}` Applied!
                    </span>
                    <button 
                      onClick={handleRemoveCoupon}
                      style={{ background: 'none', border: 'none', color: 'var(--color-ruby)', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>
                      Apply Promo Coupon
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g. WELCOME10"
                        className="input"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={isValidatingCoupon || isPlacing}
                        style={{ textTransform: 'uppercase' }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCode.trim() || isPlacing}
                        className="btn btn-secondary"
                        style={{ borderRadius: 0, padding: '0 16px' }}
                      >
                        {isValidatingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-error)', marginTop: '6px' }}>
                        {couponError}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Summary details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', borderTop: borderStyle, paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>Subtotal</span>
                  <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                {couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-success)' }}>Coupon Discount</span>
                    <span style={{ color: 'var(--color-success)' }}>−₹{couponDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>GST (18%)</span>
                  <span>₹{gst.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: borderStyle, paddingTop: '12px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700 }}>Total amount</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer strip */}
      <footer style={{
        backgroundColor: 'var(--color-charcoal)',
        borderTop: '1px solid rgba(253, 240, 213, 0.08)',
        padding: '30px 0',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(253, 240, 213, 0.3)'
      }}>
        <div className="container">
          <span>© 2026 Deevuh LLP. All Rights Reserved.</span>
        </div>
      </footer>
    </div>
  );
}
