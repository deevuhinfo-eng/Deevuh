"use client";

import Link from "next/link";
import { useState } from "react";
import { PRODUCTS } from "../../data/products";

export default function UserDashboard() {
  // Mock customer info
  const [customer, setCustomer] = useState({
    name: "Devanshu",
    email: "devanshu@website.com",
    memberSince: "May 2026",
    address: "B-42, Vasant Vihar, New Delhi - 110057, India",
    phone: "+91 98765 43210",
    measurements: {
      chest: "40 inches",
      waist: "32 inches",
      shoulder: "18 inches",
      height: "5'11\"",
      fit: "Tailored Slim Fit",
    }
  });

  const [activeTab, setActiveTab] = useState<"orders" | "sizing" | "wishlist">("orders");
  const [isEditingSizing, setIsEditingSizing] = useState(false);

  // Custom styling attributes
  const borderStyle = "1px solid var(--color-outline-variant)";

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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "var(--color-charcoal)",
            }}
          >
            ♡
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "var(--color-charcoal)",
            }}
          >
            ◇
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
                  <span style={{ color: "var(--color-charcoal)", lineHeight: 1.5 }}>{customer.address}</span>
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
                
                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                  {/* Order 1: Shipped */}
                  <div style={{ border: borderStyle, padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: borderStyle }}>
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>ORDER NO.</span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>#DV-2026-9821</h4>
                      </div>
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>PLACED ON</span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>May 22, 2026</h4>
                      </div>
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>EST. DELIVERY</span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>May 26, 2026</h4>
                      </div>
                      <div>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          backgroundColor: "rgba(152, 17, 30, 0.1)",
                          color: "var(--color-ruby)",
                          padding: "4px 10px",
                          letterSpacing: "0.05em"
                        }}>
                          SHIPPED
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: "24px", alignItems: "center" }}>
                      <img src="/products/Baby Blue Coordset/1 Picture.jpg" alt="Baby Blue Coordset" style={{ width: "80px", aspectRatio: "3/4", objectFit: "cover", border: borderStyle }} />
                      <div>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600 }}>Baby Blue Coordset</h4>
                        <span style={{ fontSize: "13px", color: "var(--color-on-surface-variant)" }}>Size: M | Qty: 1</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "18px", fontFamily: "var(--font-serif)", fontWeight: 700 }}>₹3,499</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginTop: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-on-surface-variant)", marginBottom: "8px" }}>
                        <span>Ordered</span>
                        <span style={{ color: "var(--color-ruby)", fontWeight: 700 }}>Shipped (In Transit)</span>
                        <span>Delivered</span>
                      </div>
                      <div style={{ height: "4px", backgroundColor: "var(--color-outline-variant)", position: "relative" }}>
                        <div style={{ height: "100%", width: "65%", backgroundColor: "var(--color-ruby)" }} />
                      </div>
                    </div>
                  </div>

                  {/* Order 2: Delivered */}
                  <div style={{ border: borderStyle, padding: "24px", opacity: 0.85 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: borderStyle }}>
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>ORDER NO.</span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>#DV-2026-4402</h4>
                      </div>
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>PLACED ON</span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>May 02, 2026</h4>
                      </div>
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>DELIVERED ON</span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>May 06, 2026</h4>
                      </div>
                      <div>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          backgroundColor: "rgba(44, 44, 44, 0.1)",
                          color: "var(--color-charcoal)",
                          padding: "4px 10px",
                          letterSpacing: "0.05em"
                        }}>
                          DELIVERED
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: "24px", alignItems: "center" }}>
                      <img src="/products/Beige outfit/1 picture.jpg" alt="Beige Tailored Set" style={{ width: "80px", aspectRatio: "3/4", objectFit: "cover", border: borderStyle }} />
                      <div>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600 }}>Beige Tailored Set</h4>
                        <span style={{ fontSize: "13px", color: "var(--color-on-surface-variant)" }}>Size: M | Qty: 1</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "18px", fontFamily: "var(--font-serif)", fontWeight: 700 }}>₹2,999</span>
                      </div>
                    </div>
                  </div>

                </div>
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
              }}
            >
              © 2026 DEEVUH. Handcrafted in India.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
