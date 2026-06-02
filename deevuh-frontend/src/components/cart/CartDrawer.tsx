"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { CartItem, CartSummary } from './CartComponents';

export default function CartDrawer() {
  const { cartItems, cartTotal, isOpen, toggleCart, updateCartQty, removeFromCart } = useCart();

  // Prevent background scrolling when cart drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div 
        onClick={() => toggleCart(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(44, 44, 44, 0.4)',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Drawer Body */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '460px',
        height: '100%',
        backgroundColor: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-outline-variant)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}>
        {/* Style tag for slide animation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}} />

        {/* Drawer Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--color-outline-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '22px',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            Shopping Bag ({cartItems.length})
          </h3>
          <button
            onClick={() => toggleCart(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              color: 'var(--color-charcoal)',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Drawer Body Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {cartItems.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--color-on-surface-variant)',
              paddingBottom: '60px',
            }}>
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>◇</span>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '8px' }}>
                Your Bag is Empty
              </h4>
              <p style={{ fontSize: '14px', maxWidth: '280px', lineHeight: '1.6', marginBottom: '24px' }}>
                Explore our signature tailoring and capsule coordinates to curate your ideal silhouette.
              </p>
              <button 
                onClick={() => toggleCart(false)}
                style={{
                  padding: '12px 28px',
                  backgroundColor: 'var(--color-charcoal)',
                  color: 'var(--color-cream)',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Continue Browsing
              </button>
            </div>
          ) : (
            <>
              {cartItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQty={updateCartQty}
                  onRemove={removeFromCart}
                />
              ))}
            </>
          )}
        </div>

        {/* Drawer Footer (Summary & Action) */}
        {cartItems.length > 0 && (
          <div style={{
            padding: '24px 32px',
            borderTop: '1px solid var(--color-outline-variant)',
            backgroundColor: 'var(--color-surface-container-low)',
          }}>
            <CartSummary subtotal={cartTotal} />
            
            <Link
              href="/checkout"
              onClick={() => toggleCart(false)}
              style={{
                display: 'block',
                width: '100%',
                padding: '18px 24px',
                backgroundColor: 'var(--color-ruby)',
                color: 'var(--color-cream)',
                textAlign: 'center',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginTop: '16px',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Proceed to Checkout
            </Link>
            
            <button
              onClick={() => toggleCart(false)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--color-on-surface-variant)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginTop: '8px',
                textDecoration: 'underline',
              }}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
