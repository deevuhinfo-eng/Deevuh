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
  currentUser: any;
  isAuthenticated: boolean;
  addToCart: (product: any, size: string, quantity: number) => Promise<void>;
  updateCartQty: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  toggleCart: (force?: boolean) => void;
  syncCartWithBackend: (userParam?: any) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Helper to calculate total from cart items list
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.variant.price || 0) * item.quantity,
    0
  );

  // Sync cart from backend (if logged in) or localStorage (if guest)
  const syncCartWithBackend = async (userParam?: any) => {
    const user = userParam !== undefined ? userParam : currentUser;
    if (!user) {
      // Guest behavior or fallback
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
      return;
    }

    try {
      setIsLoading(true);
      // Migrate any guest cart items from localStorage to DB cart
      const local = localStorage.getItem('deevuh_cart');
      if (local) {
        try {
          const guestItems = JSON.parse(local);
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            for (const item of guestItems) {
              let variantId = item.productVariantId;
              
              // If it is a fallback ID (unregistered static mock), dynamically resolve the DB UUID
              if (variantId?.startsWith('fallback-') && item.variant?.product?.id) {
                try {
                  const prodRes = await api.get(`/products/${item.variant.product.id}`);
                  if (prodRes?.status === 'success' && prodRes.data?.variants) {
                    const matchingVar = prodRes.data.variants.find(
                      (v: any) => v.size === item.variant.size
                    );
                    if (matchingVar) {
                      variantId = matchingVar.id;
                    }
                  }
                } catch (err) {
                  console.error('Failed to resolve fallback variant ID during migration:', err);
                }
              }

              // Only post valid UUIDs to the backend cart to prevent database cast crashes
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (variantId && uuidRegex.test(variantId) && item.quantity > 0) {
                await api.post('/cart/add', {
                  productVariantId: variantId,
                  quantity: item.quantity
                });
              }
            }
          }
        } catch (e) {
          console.error('Failed to migrate guest cart:', e);
        } finally {
          localStorage.removeItem('deevuh_cart');
        }
      }

      // Fetch user's persistent database cart
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
    } catch (err) {
      console.error('Failed to sync cart:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const meRes = await api.get('/auth/me');
      if (meRes?.status === 'success' && meRes.data) {
        setIsAuthenticated(true);
        setCurrentUser(meRes.data);
        await syncCartWithBackend(meRes.data);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCartItems([]);
      }
    } catch {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCartItems([]);
    }
  };

  // Fetch CSRF and initial auth state on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/csrf`, {
          method: 'GET',
          credentials: 'include',
        });
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      }
      
      try {
        const meRes = await api.get('/auth/me');
        if (meRes?.status === 'success' && meRes.data) {
          setIsAuthenticated(true);
          setCurrentUser(meRes.data);
          await syncCartWithBackend(meRes.data);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          // Guest mode
          const local = localStorage.getItem('deevuh_cart');
          if (local) {
            try {
              setCartItems(JSON.parse(local));
            } catch {
              setCartItems([]);
            }
          }
        }
      } catch {
        setIsAuthenticated(false);
        setCurrentUser(null);
        // Guest mode
        const local = localStorage.getItem('deevuh_cart');
        if (local) {
          try {
            setCartItems(JSON.parse(local));
          } catch {
            setCartItems([]);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
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
          // Sync without re-querying auth
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
      currentUser,
      isAuthenticated,
      addToCart,
      updateCartQty,
      removeFromCart,
      toggleCart,
      syncCartWithBackend,
      refreshAuth
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
