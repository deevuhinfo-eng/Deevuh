"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface OrderItem {
  quantity: number;
  variant: {
    size: string;
    price: string;
    product: {
      title: string;
      images: string[];
    };
  };
}

interface Order {
  id: string;
  finalAmount: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [activeOrderDetails, setActiveOrderDetails] = useState<Order | null>(null);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    try {
      setError("");
      const res: any = await api.get("/admin/orders");
      setOrders(res.data || []);
    } catch (err: any) {
      console.error("Backend orders fetch failed", err);
      setError("Failed to load orders from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const transitionOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { orderStatus: newStatus });
      fetchOrders();
      if (activeOrderDetails && activeOrderDetails.id === orderId) {
        setActiveOrderDetails({ ...activeOrderDetails, orderStatus: newStatus });
      }
    } catch (err: any) {
      alert(err.message || "Failed to update order status.");
    }
  };

  const filteredOrders = filterStatus === "ALL" 
    ? orders 
    : orders.filter(o => o.orderStatus === filterStatus);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", color: "var(--color-on-surface-variant)" }}>
        Loading capsule dispatches...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: activeOrderDetails ? "1.5fr 1fr" : "1fr", gap: "24px", alignItems: "start" }}>
      
      {/* LEFT: ORDERS LIST */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "36px", fontWeight: 600, marginBottom: "8px" }}>Orders</h1>
            <p style={{ color: "var(--color-on-surface-variant)", fontSize: "14px" }}>
              Monitor customer purchases, verify payment hashes, and advance tailored shipping states
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            {["ALL", "CREATED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  padding: "6px 12px",
                  border: filterStatus === status ? "2px solid var(--color-charcoal)" : "1px solid var(--color-outline-variant)",
                  backgroundColor: filterStatus === status ? "var(--color-charcoal)" : "transparent",
                  color: filterStatus === status ? "var(--color-cream)" : "var(--color-charcoal)",
                  cursor: "pointer",
                  borderRadius: "0px",
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: "var(--color-error-container)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Placed By</th>
                <th>Capsule Pieces</th>
                <th>Total Paid</th>
                <th>Payment</th>
                <th>Order Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--color-on-surface-variant)" }}>
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                <tr key={order.id} style={{ cursor: "pointer" }} onClick={() => setActiveOrderDetails(order)}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td>
                    <div>{order.user?.name || "Guest Customer"}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-on-surface-variant)" }}>
                      {order.user?.email || "No email"}
                    </div>
                  </td>
                  <td>
                    {order.items?.map((item, i) => (
                      <div key={i} style={{ fontSize: "12px", fontWeight: 500 }}>
                        {item.variant?.product?.title} ({item.variant?.size}) × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    ₹{Number(order.finalAmount).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className={`badge ${
                      order.paymentStatus === "SUCCESS" ? "badge-success" :
                      order.paymentStatus === "PENDING" ? "badge-warning" : "badge-error"
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      order.orderStatus === "DELIVERED" ? "badge-success" :
                      order.orderStatus === "CANCELLED" ? "badge-error" : 
                      order.orderStatus === "SHIPPED" ? "badge-primary" : "badge-warning"
                    }`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={order.orderStatus}
                      onChange={(e) => transitionOrderStatus(order.id, e.target.value)}
                      style={{
                        padding: "6px",
                        fontSize: "12px",
                        border: "1px solid var(--color-outline-variant)",
                        borderRadius: 0,
                        backgroundColor: "var(--color-surface)",
                        outline: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <option value="CREATED">CREATED</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: ACTIVE ORDER PANEL DETAILS */}
      {activeOrderDetails && (
        <div className="card-elevated animate-fade-in" style={{ padding: "24px", position: "sticky", top: "120px", border: "1px solid var(--color-outline-variant)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--color-outline-variant)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 600 }}>
              Order Specs: #{activeOrderDetails.id.slice(0, 8).toUpperCase()}
            </h3>
            <button
              onClick={() => setActiveOrderDetails(null)}
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--color-on-surface-variant)" }}
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-on-surface-variant)", textTransform: "uppercase" }}>PLACED BY</span>
              <div style={{ fontWeight: 600, marginTop: "4px" }}>{activeOrderDetails.user?.name}</div>
              <div style={{ color: "var(--color-on-surface-variant)" }}>{activeOrderDetails.user?.email}</div>
              <div style={{ color: "var(--color-on-surface-variant)" }}>{activeOrderDetails.user?.phone}</div>
            </div>

            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-on-surface-variant)", textTransform: "uppercase" }}>DISPATCH ADAPTATIONS</span>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                <span className="badge badge-primary">{activeOrderDetails.orderStatus}</span>
                <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>
                  {new Date(activeOrderDetails.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--color-outline-variant)", borderBottom: "1px solid var(--color-outline-variant)", padding: "16px 0" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-on-surface-variant)", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
                PIECES ORDERED
              </span>
              {activeOrderDetails.items?.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "50px 1fr", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                  <img src={item.variant?.product?.images[0]} style={{ width: "40px", aspectRatio: "3/4", objectFit: "cover" }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.variant?.product?.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>
                      Size: {item.variant?.size} | Qty: {item.quantity} | ₹{Number(item.variant?.price).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700 }}>
              <span>Total Gross (GST Inc.)</span>
              <span style={{ color: "var(--color-ruby)", fontSize: "18px", fontFamily: "var(--font-serif)" }}>
                ₹{Number(activeOrderDetails.finalAmount).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Advance shipment actions */}
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-on-surface-variant)" }}>ADVANCE SHIPMENT STAGE</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {activeOrderDetails.orderStatus === "CREATED" && (
                  <button onClick={() => transitionOrderStatus(activeOrderDetails.id, "PROCESSING")} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                    Accept & Tailor
                  </button>
                )}
                {activeOrderDetails.orderStatus === "PROCESSING" && (
                  <button onClick={() => transitionOrderStatus(activeOrderDetails.id, "SHIPPED")} className="btn btn-primary btn-sm" style={{ flex: 1, backgroundColor: "var(--color-ruby)" }}>
                    Dispatch Outfit
                  </button>
                )}
                {activeOrderDetails.orderStatus === "SHIPPED" && (
                  <button onClick={() => transitionOrderStatus(activeOrderDetails.id, "DELIVERED")} className="btn btn-primary btn-sm" style={{ flex: 1, backgroundColor: "green", borderColor: "green" }}>
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
