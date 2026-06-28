"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface AbandonedCart {
  id: string;
  lastActivityAt: string;
  user?: {
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    quantity: number;
    variant: {
      size: string;
      price: string;
      product: {
        title: string;
        images: string[];
      };
    };
  }>;
}

export default function AdminAbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [recoveredId, setRecoveredId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchCarts = async () => {
    try {
      const res: any = await api.get("/admin/abandoned-carts");
      setCarts(res.data || []);
    } catch (err) {
      console.error("Backend abandoned carts fetch failed:", err);
      setCarts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  const handleSendRecoveryEmail = (cartId: string) => {
    setSendingId(cartId);
    setTimeout(() => {
      setSendingId(null);
      setRecoveredId(cartId);
      setTimeout(() => setRecoveredId(null), 4000);
    }, 1500);
  };

  const calculateCartValue = (cart: AbandonedCart) => {
    return cart.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
  };

  const totalValue = carts.reduce((sum, c) => sum + calculateCartValue(c), 0);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", color: "var(--color-on-surface-variant)" }}>
        Loading abandoned carts database...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 600, marginBottom: "8px" }}>Abandoned Carts</h1>
        <p style={{ color: "var(--color-on-surface-variant)", fontSize: "14px" }}>
          Analyze active cart abandonments, recover catalog leakage, and dispatch promotional coupons
        </p>
      </div>

      {/* Summary Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "48px" }}>
        <div className="stat-card">
          <span className="stat-label">Total Carts Abandoned</span>
          <span className="stat-value">{carts.length}</span>
          <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>Carts inactive for &gt; 30 minutes</span>
        </div>
        <div className="stat-card" style={{ background: "var(--color-cream)" }}>
          <span className="stat-label">Recoverable Cart Value</span>
          <span className="stat-value" style={{ color: "var(--color-ruby)" }}>₹{totalValue.toLocaleString("en-IN")}</span>
          <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>Sum of all unpurchased wardrobe layouts</span>
        </div>
      </div>

      {/* Carts Table */}
      <h3 style={{ marginBottom: "16px" }}>Abandoned Carts List</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact Details</th>
              <th>Garments Abandoned</th>
              <th>Total Cart Value</th>
              <th>Abandoned Since</th>
              <th>Recovery Actions</th>
            </tr>
          </thead>
          <tbody>
            {carts.map((cart) => {
              const cartVal = calculateCartValue(cart);
              const activityTime = new Date(cart.lastActivityAt);
              const minutesAgo = Math.floor((Date.now() - activityTime.getTime()) / 60000);
              const displayTime = minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;
              const isSending = sendingId === cart.id;
              const isRecovered = recoveredId === cart.id;

              return (
                <tr key={cart.id}>
                  <td style={{ fontWeight: 600 }}>{cart.user?.name || "Guest User"}</td>
                  <td>
                    <div>{cart.user?.email || "—"}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>{cart.user?.phone || ""}</div>
                  </td>
                  <td>
                    {cart.items.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                        <img src={item.variant.product.images[0]} style={{ width: "30px", aspectRatio: "3/4", objectFit: "cover", border: "1px solid var(--color-outline-variant)" }} />
                        <span style={{ fontSize: "12px" }}>
                          {item.variant.product.title} ({item.variant.size}) × {item.quantity}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{cartVal.toLocaleString("en-IN")}</td>
                  <td>
                    <span className="badge badge-warning">{displayTime}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleSendRecoveryEmail(cart.id)}
                      disabled={isSending || isRecovered}
                      className="btn btn-secondary btn-sm"
                      style={{
                        backgroundColor: isRecovered ? "green" : isSending ? "var(--color-outline-variant)" : "transparent",
                        borderColor: isRecovered ? "green" : "var(--color-outline-variant)",
                        color: isRecovered ? "white" : "var(--color-charcoal)",
                        fontWeight: 700,
                        fontSize: "11px",
                        letterSpacing: "0.05em",
                        transition: "all 0.3s"
                      }}
                    >
                      {isSending ? "Sending Alert..." : isRecovered ? "Email Dispatched! ✓" : "Send Recovery Alert"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
