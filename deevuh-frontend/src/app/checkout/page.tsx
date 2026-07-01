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

  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [codEligibility, setCodEligibility] = useState<{
    eligible: boolean;
    reason?: string;
    bookingAmount: number;
    remainingAmount: number;
  } | null>(null);
  const [codLoading, setCodLoading] = useState(false);

  useEffect(() => {
    if (isVerifying || cartItems.length === 0) return;
    setCodLoading(true);
    api.get(`/checkout/cod-eligibility?cartTotal=${cartTotal - couponDiscount}`)
      .then((res: any) => {
        const data = res.data || res;
        setCodEligibility(data);
        if (data && !data.eligible && paymentMethod === 'COD') {
          setPaymentMethod('ONLINE');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch COD eligibility:', err);
      })
      .finally(() => setCodLoading(false));
  }, [isVerifying, cartItems, cartTotal, couponDiscount, paymentMethod]);

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

  // Handle PayU failure redirects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'failure') {
        setError('Payment failed or was canceled. Please review your details and try again.');
      }
    }
  }, []);

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
      paymentMethod,
    };

    try {
      const res = await api.post('/checkout/create-order', payload);
      if (res?.status === 'success' && res.data) {
        const orderData = res.data;
        
        // Refresh global cart state since items are now ordered/converted
        await syncCartWithBackend();

        if (orderData.paymentParams) {
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
  const total = cartTotal - couponDiscount;

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
            {successOrder.paymentMethod === 'COD' ? 'Your COD Order is Reserved' : 'Your Order is Placed'}
          </h1>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', marginBottom: '32px', maxWidth: '440px', margin: '0 auto 32px' }}>
            {successOrder.paymentMethod === 'COD'
              ? `We have reserved your order. You've paid a ₹${Number(successOrder.summary?.bookingAmount || 0)} booking amount. The remaining ₹${Number(successOrder.summary?.remainingCODAmount || total).toLocaleString('en-IN')} balance will be collected when your outfit arrives.`
              : 'We have securely reserved your signature capsule garment patterns. An editor from our tailoring team will reach out to you via WhatsApp/Email to verify custom measurements.'}
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
                <span style={{ fontWeight: 600 }}>{successOrder.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : successOrder.paymentMethod}</span>
              </div>
              {successOrder.paymentMethod === 'COD' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Reserve Today (Paid)</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{Number(successOrder.summary?.bookingAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Pay on Delivery</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>₹{Number(successOrder.summary?.remainingCODAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>Total Amount Paid</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-charcoal)' }}>
                    ₹{Number(successOrder.summary?.finalAmount || total).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
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

              {/* Payment Method Selection */}
              <div style={{ marginTop: '24px', marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '12px' }}>
                  Select Payment Option
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Card 1: Pay Online */}
                  <div
                    onClick={() => setPaymentMethod('ONLINE')}
                    style={{
                      border: paymentMethod === 'ONLINE' ? '2px solid var(--color-ruby)' : '1px solid var(--color-outline-variant)',
                      backgroundColor: paymentMethod === 'ONLINE' ? 'rgba(152, 17, 30, 0.03)' : 'transparent',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-charcoal)' }}>Pay Online</span>
                      {paymentMethod === 'ONLINE' && (
                        <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
                          ✓ Recommended
                        </span>
                      )}
                    </div>
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--color-on-surface-variant)', margin: '0 0 16px', lineHeight: '1.6' }}>
                      <li>Instant confirmation</li>
                      <li>Priority dispatch</li>
                      <li>Secure payment</li>
                    </ul>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginTop: 'auto', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '12px', color: 'var(--color-charcoal)' }}>
                      Pay ₹{total.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Card 2: Cash on Delivery */}
                  <div
                    onClick={() => {
                      if (codEligibility?.eligible) {
                        setPaymentMethod('COD');
                      }
                    }}
                    style={{
                      border: paymentMethod === 'COD' ? '2px solid var(--color-ruby)' : '1px solid var(--color-outline-variant)',
                      backgroundColor: paymentMethod === 'COD' ? 'rgba(152, 17, 30, 0.03)' : 'transparent',
                      padding: '20px',
                      cursor: codEligibility?.eligible ? 'pointer' : 'not-allowed',
                      opacity: codEligibility?.eligible ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-charcoal)' }}>Cash on Delivery</span>
                    </div>
                    {codLoading ? (
                      <p style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                        Checking eligibility...
                      </p>
                    ) : codEligibility ? (
                      codEligibility.eligible ? (
                        <>
                          <p style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', margin: '0 0 12px', lineHeight: '1.5' }}>
                            Reserve your order with a ₹{codEligibility.bookingAmount} confirmation amount. Adjusted in your total.
                          </p>
                          <div style={{ fontSize: '13px', fontWeight: 600, borderTop: '1px solid var(--color-outline-variant)', paddingTop: '12px', color: 'var(--color-charcoal)' }}>
                            Reserve Today: ₹{codEligibility.bookingAmount}
                          </div>
                        </>
                      ) : (
                        <p style={{ fontSize: '12px', color: 'var(--color-error)', margin: 0, lineHeight: '1.4', fontWeight: 600 }}>
                          {codEligibility.reason || 'Not eligible for COD.'}
                        </p>
                      )
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                        COD Not Available
                      </p>
                    )}
                  </div>
                </div>
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
                  borderRadius: '2px',
                }}
              >
                {isPlacing
                  ? 'Allocating Inventory...'
                  : paymentMethod === 'COD'
                  ? (codEligibility?.bookingAmount === 0 ? 'Confirm COD Order' : 'Reserve COD Order')
                  : 'Pay Securely'}
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>Shipping Charges</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Free</span>
                </div>
                {couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-success)' }}>Coupon Discount</span>
                    <span style={{ color: 'var(--color-success)' }}>−₹{couponDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {paymentMethod === 'COD' && codEligibility?.eligible ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: borderStyle, paddingTop: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>Order Total</span>
                      <span style={{ fontWeight: 600 }}>₹{total.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-ruby)', fontWeight: 600 }}>
                      <span>Reserve Today</span>
                      <span>₹{codEligibility.bookingAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-charcoal)', fontWeight: 700, borderTop: '1px dashed var(--color-outline-variant)', paddingTop: '8px' }}>
                      <span>Pay on Delivery</span>
                      <span>₹{codEligibility.remainingAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: borderStyle, paddingTop: '12px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 700 }}>Total amount</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                      ₹{total.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
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
