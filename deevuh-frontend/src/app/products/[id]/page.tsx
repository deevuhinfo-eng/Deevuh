"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { PRODUCTS, Product } from "../../../data/products";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  
  // Find product by id
  const product = PRODUCTS.find((p) => p.id === id);

  const [dbProduct, setDbProduct] = useState<any | null>(null);

  useEffect(() => {
    const fetchDbProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        if (res?.status === 'success' && res.data) {
          setDbProduct(res.data);
        }
      } catch (err) {
        console.error('Failed to load DB product variants:', err);
      }
    };
    fetchDbProduct();
  }, [id]);

  // Fallback if product not found
  if (!product) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-cream)",
          color: "var(--color-charcoal)",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "36px", marginBottom: "20px" }}>
          Piece Not Found
        </h1>
        <p style={{ fontSize: "16px", marginBottom: "32px", maxWidth: "480px" }}>
          The editorial piece you are seeking does not exist or has been withdrawn from our signature capsule collection.
        </p>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            backgroundColor: "var(--color-ruby)",
            color: "var(--color-cream)",
            padding: "14px 28px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Return to Storefront
        </Link>
      </div>
    );
  }

  const [activeImage, setActiveImage] = useState<string>(product.images[0]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"details" | "shipping">("details");

  const { addToCart, toggleCart, cartItems } = useCart();

  // Get other 3 products for the related section
  const relatedProducts = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  const handleAddToBag = async () => {
    if (!selectedSize) {
      alert("Please select a size to experience DEEVUH tailoring.");
      return;
    }
    setIsAdding(true);
    try {
      await addToCart(dbProduct || product, selectedSize, 1);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to add to bag.");
    } finally {
      setIsAdding(false);
    }
  };

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
          borderBottom: "1px solid var(--color-outline-variant)",
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
              color: "var(--color-on-surface-variant)",
              textDecoration: "none",
              padding: "8px 20px",
              border: "1px solid var(--color-outline-variant)",
              borderRadius: "0px",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-charcoal)";
              e.currentTarget.style.color = "var(--color-cream)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-on-surface-variant)";
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
            {cartItems.length > 0 ? (
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
            ) : addedSuccess ? (
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-ruby)",
                }}
              />
            ) : null}
          </button>
        </div>
      </nav>

      {/* ════════ BREADCRUMBS ════════ */}
      <div className="container" style={{ padding: "24px 0 12px 0" }}>
        <div style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", letterSpacing: "0.05em" }}>
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>HOME</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link href="/#collection-section" style={{ color: "inherit", textDecoration: "none" }}>CAPSULE</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--color-charcoal)", fontWeight: 600 }}>{product.title.toUpperCase()}</span>
        </div>
      </div>

      {/* ════════ PRODUCT PRESENTATION GRID ════════ */}
      <section className="container" style={{ paddingBottom: "80px" }}>
        <div className="product-main-grid">
          
          {/* LEFT: IMAGE PRESENTATION */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Main Primary Image */}
            <div
              style={{
                aspectRatio: "3/4",
                overflow: "hidden",
                border: "1px solid var(--color-outline-variant)",
                backgroundColor: "#eaeaea",
                position: "relative",
              }}
            >
              <img
                src={activeImage}
                alt={product.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.3s ease",
                }}
              />
            </div>

            {/* Thumbnail Gallery (All images in folder) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "10px",
                overflowX: "auto",
                paddingBottom: "8px",
              }}
            >
              {product.images.map((img, idx) => {
                const isActive = activeImage === img;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    style={{
                      aspectRatio: "3/4",
                      overflow: "hidden",
                      border: isActive ? "2px solid var(--color-ruby)" : "1px solid var(--color-outline-variant)",
                      padding: 0,
                      cursor: "pointer",
                      backgroundColor: "#f5f5f5",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <img
                      src={img}
                      alt={`${product.title} view ${idx + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: isActive ? 1 : 0.75,
                        transition: "opacity 0.2s",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DETAILS COLUMN */}
          <div
            className="product-sticky-col"
            style={{
              position: "sticky",
              top: "120px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--color-ruby)",
                marginBottom: "12px",
              }}
            >
              {product.category}
            </span>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--product-title-size)",
                fontWeight: 600,
                color: "var(--color-charcoal)",
                lineHeight: 1.2,
                marginBottom: "16px",
              }}
            >
              {product.title}
            </h1>

            {/* Price & Rating Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                marginBottom: "28px",
                paddingBottom: "24px",
                borderBottom: "1px solid var(--color-outline-variant)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "var(--product-price-size)",
                    fontWeight: 700,
                    color: "var(--color-charcoal)",
                  }}
                >
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                <span style={{ fontSize: "11px", color: "var(--color-on-surface-variant)", fontWeight: 500 }}>
                  (GST Included)
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "var(--color-ruby)" }}>★★★★★</span>
                <span style={{ fontSize: "13px", color: "var(--color-on-surface-variant)", fontWeight: 500 }}>
                  4.9 (32 Reviews)
                </span>
              </div>
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: "13px",
                lineHeight: 1.9,
                color: "var(--color-on-surface-variant)",
                marginBottom: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {product.description.split("\n\n").map((para, idx) => (
                <p key={idx} style={{ margin: 0 }}>{para}</p>
              ))}
            </div>

            {/* Size Selector */}
            <div style={{ marginBottom: "36px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Select Size
                </span>
                {selectedSize && (
                  <span style={{ fontSize: "12px", color: "var(--color-ruby)", fontWeight: 600 }}>
                    Selected: {selectedSize}
                  </span>
                )}
              </div>
              
              <div style={{ display: "flex", gap: "10px" }}>
                {product.sizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "0px",
                        border: isSelected ? "2px solid var(--color-charcoal)" : "1px solid var(--color-outline-variant)",
                        backgroundColor: isSelected ? "var(--color-charcoal)" : "transparent",
                        color: isSelected ? "var(--color-cream)" : "var(--color-charcoal)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Purchase CTA Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
              <button
                onClick={handleAddToBag}
                disabled={isAdding}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  backgroundColor: addedSuccess ? "var(--color-charcoal)" : "var(--color-ruby)",
                  color: "var(--color-cream)",
                  border: "none",
                  borderRadius: "0px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                {isAdding ? "Adding to Wardrobe..." : addedSuccess ? "Added Successfully! ✓" : "Add to Bag"}
              </button>
            </div>

            {/* Structured Accordion Tabs */}
            <div style={{ borderTop: "1px solid var(--color-outline-variant)" }}>
              {/* Tab Header Row */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--color-outline-variant)" }}>
                {[
                  { id: "details", label: "Highlights" },
                  { id: "shipping", label: "Dispatches" },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        flex: 1,
                        padding: "16px 8px",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: isActive ? "2px solid var(--color-ruby)" : "none",
                        color: isActive ? "var(--color-ruby)" : "var(--color-on-surface-variant)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Body */}
              <div style={{ padding: "20px 0" }}>
                {activeTab === "details" && (
                  <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "14px", lineHeight: "1.8", color: "var(--color-on-surface-variant)" }}>
                    {product.details.map((detail, idx) => (
                      <li key={idx} style={{ marginBottom: "8px" }}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === "shipping" && (
                  <div style={{ fontSize: "13px", lineHeight: "1.9", color: "var(--color-on-surface-variant)", margin: 0 }}>
                    <p style={{ fontWeight: 600, marginBottom: "12px", color: "var(--color-on-surface)" }}>
                      Made With Love, Delivered With Care
                    </p>
                    <p style={{ marginBottom: "12px" }}>
                      The moment you place your order, we start preparing your Deevuh fit with lots of love and attention.
                    </p>
                    <p style={{ margin: 0 }}>
                      Your outfit will reach you within 7–10 days, and trust us, it’ll be worth the wait.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════ RELATED PRODUCTS ════════ */}
      <section
        style={{
          borderTop: "1px solid var(--color-outline-variant)",
          backgroundColor: "var(--color-cream)",
          padding: "80px 0",
        }}
      >
        <div className="container">
           <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--related-title-size)",
              fontWeight: 600,
              color: "var(--color-charcoal)",
              marginBottom: "40px",
              textAlign: "center",
            }}
          >
            Complete the Wardrobe
          </h2>

          <div className="related-products-grid">
            {relatedProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-outline-variant)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Link
                  href={`/products/${p.id}`}
                  style={{
                    display: "block",
                    aspectRatio: "3/4",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.4s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                </Link>

                <div style={{ padding: "18px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--color-ruby)",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    {p.category}
                  </span>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--color-charcoal)",
                      marginBottom: "12px",
                    }}
                  >
                    <Link
                      href={`/products/${p.id}`}
                      style={{
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      {p.title}
                    </Link>
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--color-outline-variant)",
                      paddingTop: "12px",
                    }}
                  >
                    <span style={{ fontSize: "15px", fontWeight: 600 }}>
                      ₹{p.price.toLocaleString("en-IN")}
                    </span>
                    <Link
                      href={`/products/${p.id}`}
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--color-charcoal)",
                        textDecoration: "none",
                        borderBottom: "1px solid var(--color-charcoal)",
                        paddingBottom: "1px",
                      }}
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
          <div className="footer-links-grid">
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
              {
                title: "Collection",
                links: [
                  { label: "The Vatavaran Coordset", href: "/products/baby-blue-coordset" },
                  { label: "The Korean Coordset", href: "/products/beige-outfit" },
                  { label: "The Mocha Brown Coordset", href: "/products/brown-coordset" },
                  { label: "The Rani Coordset", href: "/products/dupatta-beige-outfit" },
                ],
              },
              {
                title: "Story",
                links: [
                  { label: "Our Philosophy", href: "/#our-story-section" },
                  { label: "Artisanal Cooperatives", href: "#" },
                  { label: "Sartorial Calibrations", href: "#" },
                  { label: "Carbon Neutrality", href: "#" },
                ],
              },
              {
                title: "Customer Service",
                links: [
                  { label: "Contact Support", href: "#" },
                  { label: "Dispatches & Shipping", href: "#" },
                  { label: "Sizing Calibrator", href: "#" },
                  { label: "Exchange Protocol", href: "#" },
                ],
              },
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
                    <li key={link.label} style={{ marginBottom: "12px" }}>
                      <Link
                        href={link.href}
                        style={{
                          fontSize: "13px",
                          color: "rgba(253, 240, 213, 0.4)",
                          textDecoration: "none",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-cream)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253, 240, 213, 0.4)")}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="footer-bottom">
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
            <div style={{ display: "flex", gap: "32px" }}>
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Refund Policy", href: "/refund" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: "12px",
                    color: "rgba(253, 240, 213, 0.3)",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(253, 240, 213, 0.6)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253, 240, 213, 0.3)")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
