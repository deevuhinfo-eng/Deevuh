"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PRODUCTS } from "../../data/products";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function UserDashboard() {
  const { cartItems, toggleCart } = useCart();
  const router = useRouter();
  const [customer, setCustomer] = useState({
    name: "Loading...",
    email: "Loading...",
    memberSince: "Loading...",
    address: "",
    phone: "",
    measurements: {
      chest: "40 inches",
      waist: "32 inches",
      shoulder: "18 inches",
      height: "5'11\"",
      fit: "Tailored Slim Fit",
    }
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "sizing" | "wishlist">("orders");
  const [isEditingSizing, setIsEditingSizing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch current user details
        const meRes = await api.get<{ status: string; data: any }>('/auth/me');
        const user = meRes.data;
        
        // Fetch orders
        const ordersRes = await api.get<{ status: string; data: any[] }>('/orders');
        const userOrders = ordersRes.data || [];
        
        setOrders(userOrders);

        // Get address from latest order if not provided
        let latestAddress = "No address saved";
        let phone = user.phone || "Not provided";
        
        if (userOrders.length > 0) {
          const latestOrder = userOrders[0];
          if (latestOrder.shippingAddress) {
            latestAddress = latestOrder.shippingAddress;
          }
          if (!user.phone && latestOrder.shippingPhone) {
            phone = latestOrder.shippingPhone;
          }
        }

        setCustomer(prev => ({
          ...prev,
          name: user.name || "Valued Customer",
          email: user.email,
          phone: phone,
          memberSince: user.createdAt 
            ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
            : "May 2026",
          address: latestAddress
        }));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        router.replace('/login?redirect=/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  // Custom styling attributes
  const borderStyle = "1px solid var(--color-outline-variant)";

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-surface)',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          color: 'var(--color-on-surface-variant)',
          letterSpacing: '0.05em',
        }}>
          Synchronizing dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-surface)", paddingTop: "90px" }}>
      {/* ════════ NAVIGATION ════════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 48px",
          backdropFilter: "blur(16px)",
          backgroundColor: "rgba(252, 249, 248, 0.85)",
          borderBottom: borderStyle,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--color-ruby)",
            textDecoration: "none",
            letterSpacing: "0.15em",
          }}
        >
          DEEVUH
        </Link>

        <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
          <Link
            href="/#collection-section"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-charcoal)",
              textDecoration: "none",
            }}
          >
            Collection
          </Link>
          <Link
            href="/#philosophy-section"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-charcoal)",
              textDecoration: "none",
            }}
          >
            Our Story
          </Link>
          <Link
            href="#"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-charcoal)",
              textDecoration: "none",
            }}
          >
            Contact
          </Link>
        </div>

        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              backgroundColor: "var(--color-charcoal)",
              color: "var(--color-cream)",
              textDecoration: "none",
              padding: "8px 20px",
              border: "1px solid var(--color-charcoal)",
              borderRadius: "0px",
            }}
          >
            My Dashboard
          </Link>
          <button
            onClick={handleLogout}
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              backgroundColor: "transparent",
              color: "var(--color-charcoal)",
              border: "1px solid var(--color-charcoal)",
              padding: "8px 20px",
              borderRadius: "0px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-charcoal)";
              e.currentTarget.style.color = "var(--color-cream)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-charcoal)";
            }}
          >
            Logout
          </button>
          <button
            onClick={() => toggleCart(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              color: "var(--color-charcoal)",
              position: "relative",
              marginLeft: "10px"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartItems.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-6px",
                  backgroundColor: "var(--color-ruby)",
                  color: "white",
                  fontSize: "9px",
                  fontWeight: 700,
                  width: "15px",
                  height: "15px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {cartItems.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ════════ HEADER BANNER ════════ */}
      <section style={{ backgroundColor: "var(--color-cream)", borderBottom: borderStyle, padding: "48px 0" }}>
        <div className="container">
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "var(--color-ruby)", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>
            WELCOME BACK
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "42px", fontWeight: 600, color: "var(--color-charcoal)", margin: 0 }}>
            Hello, {customer.name}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-on-surface-variant)", margin: "8px 0 0 0" }}>
            Premium Capsule Guild Member since {customer.memberSince} ◆ Standard Tier
          </p>
        </div>
      </section>

      {/* ════════ MAIN WORKSPACE ════════ */}
      <section className="container" style={{ padding: "60px 0 100px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "48px", alignItems: "start" }}>
          
          {/* LEFT COLUMN: QUICK PROFILE CARD & TABS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Quick Profile Summary */}
            <div style={{ border: borderStyle, padding: "24px", backgroundColor: "var(--color-surface-container-lowest)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
                My Profile
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--color-on-surface-variant)", fontSize: "12px", display: "block" }}>EMAIL</span>
                  <span style={{ color: "var(--color-charcoal)" }}>{customer.email}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--color-on-surface-variant)", fontSize: "12px", display: "block" }}>PHONE</span>
                  <span style={{ color: "var(--color-charcoal)" }}>{customer.phone}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--color-on-surface-variant)", fontSize: "12px", display: "block" }}>SHIPPING ADDRESS</span>
                  <span style={{ color: "var(--color-charcoal)", lineHeight: 1.5 }}>{customer.address || "No address saved"}</span>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Tabs */}
            <div style={{ display: "flex", flexDirection: "column", border: borderStyle, backgroundColor: "var(--color-surface-container-lowest)" }}>
              {[
                { id: "orders", label: "My Orders", icon: "▤" },
                { id: "sizing", label: "Custom Sizing Profile", icon: "✂" },
                { id: "wishlist", label: "Curated Wishlist", icon: "♡" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "16px 20px",
                      backgroundColor: isActive ? "var(--color-cream)" : "transparent",
                      border: "none",
                      borderBottom: borderStyle,
                      borderLeft: isActive ? "4px solid var(--color-ruby)" : "4px solid transparent",
                      color: isActive ? "var(--color-ruby)" : "var(--color-charcoal)",
                      fontSize: "13px",
                      fontWeight: isActive ? 700 : 500,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 0.2s",
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAIL WORKSPACES */}
          <div style={{ border: borderStyle, padding: "40px", backgroundColor: "var(--color-surface-container-lowest)" }}>
            
            {/* WORKSPACE: ORDERS */}
            {activeTab === "orders" && (
              <div>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", fontWeight: 600, marginBottom: "28px" }}>
                  Your Orders
                </h2>
                
                {orders.length === 0 ? (
                  <div style={{ border: borderStyle, padding: "40px", textAlign: "center", color: "var(--color-on-surface-variant)" }}>
                    <span style={{ fontSize: "15px", display: "block", marginBottom: "16px" }}>
                      You haven't placed any orders yet.
                    </span>
                    <Link
                      href="/#collection-section"
                      style={{
                        display: "inline-block",
                        padding: "10px 24px",
                        backgroundColor: "var(--color-charcoal)",
                        color: "var(--color-cream)",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        transition: "opacity 0.2s"
                      }}
                    >
                      Explore Collection
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                    {orders.map((order) => {
                      const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });

                      const statusColors: Record<string, { bg: string, text: string }> = {
                        CREATED: { bg: 'rgba(218, 165, 32, 0.1)', text: 'goldenrod' },
                        PROCESSING: { bg: 'rgba(218, 165, 32, 0.1)', text: 'goldenrod' },
                        SHIPPED: { bg: 'rgba(152, 17, 30, 0.1)', text: 'var(--color-ruby)' },
                        DELIVERED: { bg: 'rgba(44, 44, 44, 0.1)', text: 'var(--color-charcoal)' },
                        CANCELLED: { bg: 'rgba(220, 53, 69, 0.1)', text: 'red' },
                      };
                      
                      const currentStatusColor = statusColors[order.orderStatus] || { bg: 'rgba(0,0,0,0.05)', text: 'var(--color-charcoal)' };

                      return (
                        <div key={order.id} style={{ border: borderStyle, padding: "24px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: borderStyle, flexWrap: "wrap", gap: "16px" }}>
                            <div>
                              <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>ORDER NO.</span>
                              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>#{order.id.slice(0, 8).toUpperCase()}</h4>
                            </div>
                            <div>
                              <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>PLACED ON</span>
                              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>{formattedDate}</h4>
                            </div>
                            <div>
                              <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>STATUS</span>
                              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>{order.orderStatus}</h4>
                            </div>
                            <div>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                backgroundColor: currentStatusColor.bg,
                                color: currentStatusColor.text,
                                padding: "4px 10px",
                                letterSpacing: "0.05em"
                              }}>
                                {order.orderStatus}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {order.items?.map((item: any) => {
                              const productTitle = item.variant?.product?.title || "Tailored Garment";
                              const productImage = item.variant?.product?.images?.[0]?.imageUrl || "/products/Baby Blue Coordset/1 Picture.jpg";
                              const price = Number(item.unitPrice || 0);

                              return (
                                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: "24px", alignItems: "center" }}>
                                  <img src={productImage} alt={productTitle} style={{ width: "80px", aspectRatio: "3/4", objectFit: "cover", border: borderStyle }} />
                                  <div>
                                    <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600 }}>{productTitle}</h4>
                                    <span style={{ fontSize: "13px", color: "var(--color-on-surface-variant)" }}>
                                      Size: {item.variant?.size || "Custom"} | Qty: {item.quantity}
                                    </span>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <span style={{ fontSize: "18px", fontFamily: "var(--font-serif)", fontWeight: 700 }}>
                                      ₹{price.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: borderStyle }}>
                            <span style={{ fontSize: "14px", color: "var(--color-on-surface-variant)" }}>Total Paid</span>
                            <span style={{ fontSize: "20px", fontFamily: "var(--font-serif)", fontWeight: 700 }}>
                              ₹{Number(order.finalAmount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* WORKSPACE: SIZING */}
            {activeTab === "sizing" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", fontWeight: 600, margin: 0 }}>
                    Custom Tailoring Profile
                  </h2>
                  <button
                    onClick={() => setIsEditingSizing(!isEditingSizing)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-ruby)",
                      fontWeight: 700,
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--color-ruby)"
                    }}
                  >
                    {isEditingSizing ? "Save Profile" : "Edit Measurements"}
                  </button>
                </div>

                <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--color-on-surface-variant)", marginBottom: "32px" }}>
                  Our capsule collections are calibrated to your specific measurements for that signature draped silhouette. Update your metrics below, and our master tailors will adapt each pattern.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  {[
                    { key: "chest", label: "Chest Circumference", val: customer.measurements.chest },
                    { key: "waist", label: "Waist Circumference", val: customer.measurements.waist },
                    { key: "shoulder", label: "Shoulder-to-Shoulder", val: customer.measurements.shoulder },
                    { key: "height", label: "Overall Height", val: customer.measurements.height },
                  ].map((m) => (
                    <div key={m.key} style={{ border: borderStyle, padding: "20px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--color-on-surface-variant)", display: "block", textTransform: "uppercase", marginBottom: "6px" }}>
                        {m.label}
                      </span>
                      {isEditingSizing ? (
                        <input
                          type="text"
                          defaultValue={m.val}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: borderStyle,
                            borderRadius: 0,
                            outline: "none",
                            fontSize: "15px",
                            fontFamily: "inherit"
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-charcoal)" }}>{m.val}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ border: borderStyle, padding: "20px", marginTop: "24px", backgroundColor: "var(--color-cream)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--color-ruby)", display: "block", textTransform: "uppercase", marginBottom: "6px" }}>
                    CALIBRATED FIT STYLE
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-charcoal)" }}>
                    {customer.measurements.fit}
                  </span>
                </div>
              </div>
            )}

            {/* WORKSPACE: WISHLIST */}
            {activeTab === "wishlist" && (
              <div>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", fontWeight: 600, marginBottom: "28px" }}>
                  Curated Wishlist
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  {PRODUCTS.slice(2, 4).map((p) => (
                    <div key={p.id} style={{ border: borderStyle, display: "flex", flexDirection: "column" }}>
                      <div style={{ aspectRatio: "3/4", overflow: "hidden", borderBottom: borderStyle, position: "relative" }}>
                        <img src={p.images[0]} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            backgroundColor: "rgba(252, 249, 248, 0.9)",
                            border: "none",
                            borderRadius: "50%",
                            width: "32px",
                            height: "32px",
                            cursor: "pointer",
                            fontSize: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--color-ruby)",
                          }}
                        >
                          ♥
                        </button>
                      </div>
                      <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600 }}>{p.title}</h4>
                        <span style={{ fontSize: "16px", fontFamily: "var(--font-serif)", fontWeight: 700, marginBottom: "16px" }}>
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                        <Link
                          href={`/products/${p.id}`}
                          style={{
                            marginTop: "auto",
                            textAlign: "center",
                            padding: "10px",
                            backgroundColor: "var(--color-charcoal)",
                            color: "var(--color-cream)",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            textDecoration: "none"
                          }}
                        >
                          Add to Wardrobe
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer
        style={{
          backgroundColor: "var(--color-charcoal)",
          borderTop: "1px solid rgba(253, 240, 213, 0.08)",
          padding: "60px 0 40px",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: "48px",
              marginBottom: "60px",
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "var(--color-cream)",
                  letterSpacing: "0.15em",
                  marginBottom: "20px",
                }}
              >
                DEEVUH
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "rgba(253, 240, 213, 0.5)",
                  maxWidth: "300px",
                }}
              >
                Where divine beauty meets ultra-contemporary elegance. Crafting high-fidelity garments for the curated capsule wardrobe.
              </p>
            </div>

            {[
              { title: "Collection", links: ["Baby Blue Coordset", "Beige Tailored Set", "Brown Earthy Coordset", "Beige Dupatta Set"] },
              { title: "Story", links: ["Our Philosophy", "Artisanal Cooperatives", "Sartorial Calibrations", "Carbon Neutrality"] },
              { title: "Customer Service", links: ["Contact Support", "Dispatches & Shipping", "Sizing Calibrator", "Exchange Protocol"] },
            ].map((col) => (
              <div key={col.title}>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--color-cream)",
                    marginBottom: "20px",
                  }}
                >
                  {col.title}
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map((link) => (
                    <li key={link} style={{ marginBottom: "12px" }}>
                      <Link
                        href="#"
                        style={{
                          fontSize: "13px",
                          color: "rgba(253, 240, 213, 0.4)",
                          textDecoration: "none",
                          transition: "color 0.2s",
                        }}
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(253, 240, 213, 0.08)",
              paddingTop: "30px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "rgba(253, 240, 213, 0.3)",
                lineHeight: "1.6"
              }}
            >
              © 2026 Deevuh LLP. All Rights Reserved.<br />
              Registered Office: B-42, Vasant Vihar, New Delhi - 110057, India.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
