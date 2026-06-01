"use client";

import Link from "next/link";
import { useState } from "react";
import { PRODUCTS } from "../data/products";

export default function Home() {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  // Custom staggered/rotated collage layout details for each product
  const collageStyles = [
    {
      height: "550px",
      alignSelf: "flex-start",
      rotation: -1.2,
      marginRight: "-12px",
      zIndex: 2,
    },
    {
      height: "460px",
      alignSelf: "flex-end",
      rotation: 1.5,
      marginLeft: "-12px",
      marginRight: "-20px",
      zIndex: 4,
      marginBottom: "20px",
    },
    {
      height: "580px",
      alignSelf: "center",
      rotation: -0.8,
      marginLeft: "-20px",
      marginRight: "-15px",
      zIndex: 3,
    },
    {
      height: "490px",
      alignSelf: "flex-start",
      rotation: 1.0,
      marginLeft: "-15px",
      zIndex: 1,
      marginTop: "40px",
    },
  ];

  // Use a beautiful full image from the Combo folder for philosophy section
  const philosophyImage = "/products/Combo/DSC_0079.jpg";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-surface)" }}>
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
            transition: "opacity 0.2s",
          }}
        >
          DEEVUH
        </Link>

        <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
          {["Collection", "Our Story", "Contact"].map((item) => (
            <Link
              key={item}
              href={
                item === "Collection"
                  ? "#collection-section"
                  : item === "Our Story"
                  ? "#philosophy-section"
                  : "#footer-section"
              }
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-charcoal)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ruby)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-charcoal)")}
            >
              {item}
            </Link>
          ))}
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "var(--color-charcoal)",
              position: "relative",
            }}
          >
            ◇
          </button>
        </div>
      </nav>

      {/* ════════ HERO SECTION ════════ */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          background: "var(--color-cream)",
          paddingTop: "100px",
          paddingBottom: "80px",
          overflow: "hidden",
        }}
      >
        <div
          className="container hero-grid"
          style={{
            width: "100%",
          }}
        >
          <div style={{ paddingRight: "10px", zIndex: 10 }}>
            <span
              className="label-lg"
              style={{
                color: "var(--color-ruby)",
                marginBottom: "20px",
                display: "block",
                fontWeight: 600,
                letterSpacing: "0.2em",
              }}
            >
              EDITORIAL V3 / 2026
            </span>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "50px",
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--color-charcoal)",
                marginBottom: "44px",
              }}
            >
              A{" "}
              <span style={{ color: "var(--color-ruby)", fontStyle: "italic" }}>Deevuh</span>
              {" "}gets what she wants.
            </h1>


            <div style={{ display: "flex", gap: "16px" }}>
              <Link
                href="#collection-section"
                className="btn btn-primary btn-lg"
                style={{
                  textDecoration: "none",
                  backgroundColor: "var(--color-ruby)",
                  color: "var(--color-cream)",
                  padding: "16px 36px",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  borderRadius: "0px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-block",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                View Collection
              </Link>
              <Link
                href="#philosophy-section"
                className="btn btn-secondary btn-lg"
                style={{
                  textDecoration: "none",
                  backgroundColor: "transparent",
                  color: "var(--color-charcoal)",
                  padding: "16px 36px",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  borderRadius: "0px",
                  border: "1px solid var(--color-charcoal)",
                  display: "inline-block",
                  transition: "all 0.3s"
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
                Our Philosophy
              </Link>
            </div>
          </div>

          {/* Asymmetric Overlapping Mood Board Collage */}
          <div
            className="hero-collage"
          >
            {PRODUCTS.map((prod, idx) => {
              const style = collageStyles[idx];
              const isHovered = hoveredProduct === prod.id;

              return (
                <Link
                  key={prod.id}
                  href={`/products/${prod.id}`}
                  className="hero-collage-item"
                  style={{
                    "--item-height": style.height,
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid var(--color-outline-variant)",
                    backgroundColor: "var(--color-surface-container-lowest)",
                    display: "block",
                    textDecoration: "none",
                    width: "25%",
                    alignSelf: style.alignSelf,
                    transform: isHovered 
                      ? "scale(1.06) rotate(0deg) translateY(-8px)" 
                      : `scale(1) rotate(${style.rotation}deg)`,
                    zIndex: isHovered ? 10 : style.zIndex,
                    marginLeft: style.marginLeft || "0px",
                    marginRight: style.marginRight || "0px",
                    marginTop: style.marginTop || "0px",
                    marginBottom: style.marginBottom || "0px",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: isHovered 
                      ? "0 20px 40px rgba(44, 44, 44, 0.15)" 
                      : "0 4px 12px rgba(44, 44, 44, 0.04)",
                  } as React.CSSProperties}
                  onMouseEnter={() => setHoveredProduct(prod.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  <img
                    src={prod.images[0]}
                    alt={prod.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  
                  {/* Subtle Text Tag Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "20px 12px 16px 12px",
                      background: "linear-gradient(transparent, rgba(44, 44, 44, 0.95))",
                      display: "flex",
                      flexDirection: "column",
                      opacity: isHovered ? 1 : 0.85,
                      transition: "opacity 0.3s",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: "var(--color-cream)",
                        opacity: 0.8,
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      {prod.category}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--color-cream)",
                        letterSpacing: "0.02em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {prod.title}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ BRAND STRIP ════════ */}
      <section
        style={{
          backgroundColor: "var(--color-charcoal)",
          padding: "26px 0",
          overflow: "hidden",
        }}
      >
        <div
          className="brand-strip-content"
        >
          {["Handcrafted", "Sustainable", "Premium Fabrics", "Made in India", "Limited Edition"].map(
            (text) => (
              <span
                key={text}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-cream)",
                  whiteSpace: "nowrap",
                  opacity: 0.8,
                }}
              >
                ◆ {text}
              </span>
            )
          )}
        </div>
      </section>

      {/* ════════ THE SIGNATURE COLLECTION ════════ */}
      <section
        id="collection-section"
        className="section-gap"
        style={{
          backgroundColor: "var(--color-surface-container-low)",
          paddingTop: "100px",
          paddingBottom: "100px",
          borderTop: "1px solid var(--color-outline-variant)",
          borderBottom: "1px solid var(--color-outline-variant)",
        }}
      >
        <div className="container">
          <div
            style={{
              textAlign: "center",
              marginBottom: "72px",
            }}
          >
            <span
              className="label-lg"
              style={{
                color: "var(--color-ruby)",
                marginBottom: "12px",
                display: "block",
                fontWeight: 600,
                letterSpacing: "0.15em",
              }}
            >
              THE FOUR PIECES
            </span>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "44px",
                fontWeight: 600,
                color: "var(--color-charcoal)",
                marginBottom: "20px",
              }}
            >
              The Signature Capsule
            </h2>
            <div
              style={{
                width: "60px",
                height: "1px",
                backgroundColor: "var(--color-ruby)",
                margin: "0 auto 24px auto",
              }}
            />
            <p
              style={{
                fontSize: "16px",
                color: "var(--color-on-surface-variant)",
                maxWidth: "520px",
                margin: "0 auto",
                lineHeight: 1.8,
              }}
            >
              Discover our exclusive four-outfit release. Painstakingly tailored in limited numbers, using fine fabrics and rich textures.
            </p>
          </div>

          <div className="signature-grid">
            {PRODUCTS.map((product) => {
              const isHovered = hoveredProduct === product.id;
              // If hovered, show 2nd image. Otherwise show 1st image.
              const currentImage = isHovered && product.images[1] ? product.images[1] : product.images[0];

              return (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: "var(--color-surface-container-lowest)",
                    border: "1px solid var(--color-outline-variant)",
                    position: "relative",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  <Link
                    href={`/products/${product.id}`}
                    style={{
                      display: "block",
                      aspectRatio: "3/4",
                      overflow: "hidden",
                      position: "relative",
                      background: "#eaeaea",
                    }}
                  >
                    <img
                      src={currentImage}
                      alt={product.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                        transform: isHovered ? "scale(1.05)" : "scale(1)",
                      }}
                    />
                    
                    {/* Size tag indicator on hover */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0",
                        left: "0",
                        right: "0",
                        backgroundColor: "rgba(252, 249, 248, 0.9)",
                        backdropFilter: "blur(4px)",
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        color: "var(--color-charcoal)",
                        transform: isHovered ? "translateY(0)" : "translateY(100%)",
                        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        borderTop: "1px solid var(--color-outline-variant)",
                      }}
                    >
                      Available in: {product.sizes.join(", ")}
                    </div>
                  </Link>

                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "var(--color-ruby)",
                        marginBottom: "8px",
                      }}
                    >
                      {product.category}
                    </span>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "var(--color-charcoal)",
                        marginBottom: "12px",
                        lineHeight: 1.3,
                      }}
                    >
                      <Link
                        href={`/products/${product.id}`}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        {product.title}
                      </Link>
                    </h3>
                    
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "auto",
                        paddingTop: "16px",
                        borderTop: "1px solid var(--color-outline-variant)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "17px",
                          fontWeight: 700,
                          color: "var(--color-charcoal)",
                        }}
                      >
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                      <Link
                        href={`/products/${product.id}`}
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--color-charcoal)",
                          textDecoration: "none",
                          borderBottom: "1px solid var(--color-charcoal)",
                          paddingBottom: "2px",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--color-ruby)";
                          e.currentTarget.style.borderBottomColor = "var(--color-ruby)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--color-charcoal)";
                          e.currentTarget.style.borderBottomColor = "var(--color-charcoal)";
                        }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ EDITORIAL PHILOSOPHY ════════ */}
      <section
        id="philosophy-section"
        style={{
          backgroundColor: "var(--color-cream)",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid var(--color-outline-variant)",
        }}
      >
        <div
          className="container philosophy-grid"
          style={{
            paddingTop: "0px",
            paddingBottom: "0px",
          }}
        >
          <div className="philosophy-text-col" style={{ padding: "80px 80px 80px 0" }}>
            <span
              className="label-lg"
              style={{
                color: "var(--color-ruby)",
                marginBottom: "16px",
                display: "block",
                fontWeight: 600,
                letterSpacing: "0.15em",
              }}
            >
              OUR MANIFESTO
            </span>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "40px",
                fontWeight: 600,
                lineHeight: 1.2,
                color: "var(--color-charcoal)",
                marginBottom: "28px",
              }}
            >
              Crafted with Rigorous Intention
            </h2>
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.8,
                color: "var(--color-on-surface-variant)",
                marginBottom: "24px",
              }}
            >
              DEEVUH was born from a singular vision: to dismantle the noise of hyper-fast fashion and return to a state of absolute garment integrity. We do not design hundreds of disposable pieces. We design four complete, beautiful outfits.
            </p>
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.8,
                color: "var(--color-on-surface-variant)",
                marginBottom: "40px",
              }}
            >
              Our textiles are sourced directly from handloom weaver co-operatives. Every seam is checked, every button sewn by hand, and every fit calibrated to feel like second skin.
            </p>
            <div style={{ display: "inline-block" }}>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--color-ruby)",
                  fontStyle: "italic",
                }}
              >
                No compromise. Just pure form.
              </span>
            </div>
          </div>
          <div
            className="philosophy-image-col"
            style={{
              height: "100%",
              overflow: "hidden",
              borderLeft: "1px solid var(--color-outline-variant)",
              alignSelf: "stretch",
              position: "relative",
              minHeight: "560px",
            }}
          >
            <img
              src={philosophyImage}
              alt="Artisanal tailor working on DEEVUH garments"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                inset: 0,
              }}
            />
          </div>
        </div>
      </section>

      {/* ════════ NEWSLETTER ════════ */}
      <section
        className="section-gap"
        style={{
          backgroundColor: "var(--color-charcoal)",
          paddingTop: "90px",
          paddingBottom: "90px",
        }}
      >
        <div
          className="container"
          style={{ textAlign: "center", maxWidth: "680px" }}
        >
          <span
            className="label-lg"
            style={{
              color: "var(--color-cream)",
              opacity: 0.6,
              marginBottom: "16px",
              display: "block",
              fontWeight: 600,
              letterSpacing: "0.15em",
            }}
          >
            SUBSCRIBE
          </span>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "38px",
              fontWeight: 600,
              color: "var(--color-cream)",
              marginBottom: "20px",
            }}
          >
            Join the DEEVUH Society
          </h2>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: "rgba(253, 240, 213, 0.6)",
              marginBottom: "40px",
            }}
          >
            Subscribe to receive private invitations to our capsule drops, exclusive product insights, and designer journals.
          </p>

          <div
            style={{
              display: "flex",
              maxWidth: "500px",
              margin: "0 auto",
              border: "1px solid rgba(253, 240, 213, 0.2)",
            }}
          >
            <input
              type="email"
              placeholder="Your email address"
              style={{
                flex: 1,
                padding: "16px 24px",
                fontSize: "14px",
                border: "none",
                borderRadius: 0,
                background: "rgba(253, 240, 213, 0.05)",
                color: "var(--color-cream)",
                outline: "none",
              }}
            />
            <button
              style={{
                borderRadius: 0,
                padding: "16px 36px",
                backgroundColor: "var(--color-cream)",
                color: "var(--color-charcoal)",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Join
            </button>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer
        id="footer-section"
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
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-cream)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253, 240, 213, 0.4)")}
                      >
                        {link}
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
              }}
            >
              © 2026 DEEVUH. Handcrafted in India.
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
