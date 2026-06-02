"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

export interface CartItem {
  id: string; // cartItem.id or local generated string
  productVariantId: string;
  quantity: number;
  variant: {
    id: string;
    size: string;
    price: string;
    product: {
      id: string;
      title: string;
      images: Array<{ imageUrl: string }>;
    };
  };
}

interface CartContextType {
  cartItems: CartItem[];
  cartTotal: number;
  isOpen: boolean;
  isLoading: boolean;
  addToCart: (product: any, size: string, quantity: number) => Promise<void>;
  updateCartQty: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  toggleCart: (force?: boolean) => void;
  syncCartWithBackend: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Helper to calculate total from cart items list
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.variant.price || 0) * item.quantity,
    0
  );

  // Sync cart from backend (if logged in) or localStorage (if guest)
  const syncCartWithBackend = async () => {
    try {
      setIsLoading(true);
      // Determine if logged in by checking auth/me
      const meRes = await api.get('/auth/me');
      if (meRes?.status === 'success') {
        setIsAuthenticated(true);
        // User logged in, fetch from DB
        const cartRes = await api.get('/cart');
        if (cartRes?.status === 'success' && cartRes.data?.items) {
          // Normalise backend cart structure to frontend CartItem interface
          const mappedItems = cartRes.data.items.map((item: any) => ({
            id: item.id,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            variant: {
              id: item.variant.id,
              size: item.variant.size,
              price: String(item.variant.price),
              product: {
                id: item.variant.product.id,
                title: item.variant.product.title,
                images: item.variant.product.images.map((img: any) => ({
                  imageUrl: img.imageUrl
                }))
              }
            }
          }));
          setCartItems(mappedItems);
        } else {
          setCartItems([]);
        }
      } else {
        throw new Error('Not logged in');
      }
    } catch {
      setIsAuthenticated(false);
      // User is a guest, fetch from localStorage
      const local = localStorage.getItem('deevuh_cart');
      if (local) {
        try {
          setCartItems(JSON.parse(local));
        } catch {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncCartWithBackend();
  }, []);

  // Sync guest cart to local storage whenever it changes
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      localStorage.setItem('deevuh_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isAuthenticated, isLoading]);

  const toggleCart = (force?: boolean) => {
    setIsOpen(prev => (typeof force === 'boolean' ? force : !prev));
  };

  const addToCart = async (product: any, size: string, quantity: number) => {
    setIsLoading(true);
    // Find variant for the selected size
    const selectedVariant = product.variants?.find((v: any) => v.size === size) || {
      id: `fallback-var-${size}`,
      size,
      price: String(product.price)
    };

    if (isAuthenticated) {
      try {
        // Authenticated: save to database
        const res = await api.post('/cart/add', {
          productVariantId: selectedVariant.id,
          quantity
        });
        if (res?.status === 'success') {
          await syncCartWithBackend();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to add to cart.');
      }
    } else {
      // Guest: save in local memory
      setCartItems(prev => {
        const existingIdx = prev.findIndex(
          item => item.productVariantId === selectedVariant.id
        );

        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].quantity += quantity;
          return updated;
        } else {
          const newItem: CartItem = {
            id: `local-item-${Date.now()}`,
            productVariantId: selectedVariant.id,
            quantity,
            variant: {
              id: selectedVariant.id,
              size: selectedVariant.size,
              price: String(selectedVariant.price || product.price),
              product: {
                id: product.id,
                title: product.title,
                images: product.images.map((img: any) => ({
                  imageUrl: typeof img === 'string' ? img : (img.imageUrl || "")
                }))
              }
            }
          };
          return [newItem, ...prev];
        }
      });
      setIsOpen(true);
    }
    setIsLoading(false);
  };

  const updateCartQty = async (cartItemId: string, quantity: number) => {
    if (isAuthenticated) {
      try {
        setIsLoading(true);
        await api.put('/cart/update', { cartItemId, quantity });
        await syncCartWithBackend();
      } catch (err: any) {
        alert(err.message || 'Failed to update quantity.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (quantity <= 0) {
        setCartItems(prev => prev.filter(item => item.id !== cartItemId));
      } else {
        setCartItems(prev =>
          prev.map(item => (item.id === cartItemId ? { ...item, quantity } : item))
        );
      }
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    if (isAuthenticated) {
      try {
        setIsLoading(true);
        await api.delete('/cart/remove', { cartItemId });
        await syncCartWithBackend();
      } catch (err: any) {
        alert(err.message || 'Failed to remove item.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartTotal,
      isOpen,
      isLoading,
      addToCart,
      updateCartQty,
      removeFromCart,
      toggleCart,
      syncCartWithBackend
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
