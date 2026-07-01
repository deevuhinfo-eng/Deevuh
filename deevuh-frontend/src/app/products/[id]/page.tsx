"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { PRODUCTS, Product } from "../../../data/products";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

const mapBackendProduct = (prod: any): Product => ({
  id: prod.id,
  title: prod.title,
  price: Number(prod.basePrice || prod.price || 0),
  category: prod.category,
  description: prod.description,
  images: prod.images ? prod.images.map((img: any) => typeof img === 'string' ? img : (img.imageUrl || "")) : [],
  sizes: prod.variants && prod.variants.length > 0 ? Array.from(new Set(prod.variants.map((v: any) => v.size))) as string[] : (prod.sizes || []),
  details: prod.details || ["Premium handcrafted fabric", "Made in India"],
});

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  
  const [dbProduct, setDbProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDbProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        if (res?.status === 'success' && res.data) {
          setDbProduct(res.data);
        }
      } catch (err) {
        console.error('Failed to load DB product variants:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDbProduct();
  }, [id]);

  // Resolve product metadata by combining database details (source of truth for price, variants, stock) with static brand copy (details, full description layout).
  const product = (() => {
    if (!dbProduct) return undefined;
    
    // Find static copy template if available
    const titleMap: Record<string, string> = {
      'Baby Blue Coordset': 'baby-blue-coordset',
      'The Vatavaran Coordset': 'baby-blue-coordset',
      'Beige Tailored Set': 'beige-outfit',
      'The Korean Coordset': 'beige-outfit',
      'Brown Earthy Coordset': 'brown-coordset',
      'The Mocha Brown Coordset': 'brown-coordset',
      'Beige Dupatta Set': 'dupatta-beige-outfit',
      'The Rani Coordset': 'dupatta-beige-outfit',
    };
    const staticId = titleMap[dbProduct.title];
    const staticCopy = staticId ? PRODUCTS.find((p) => p.id === staticId) : undefined;
    
    return {
      id: staticId || dbProduct.id,
      title: dbProduct.title,
      price: Number(dbProduct.basePrice || dbProduct.price || 0),
      category: dbProduct.category,
      description: dbProduct.description || (staticCopy?.description || ""),
      images: dbProduct.images && dbProduct.images.length > 0 
        ? dbProduct.images.map((img: any) => typeof img === 'string' ? img : (img.imageUrl || "")) 
        : (staticCopy?.images || []),
      sizes: dbProduct.variants && dbProduct.variants.length > 0 
        ? Array.from(new Set(dbProduct.variants.map((v: any) => v.size))) as string[] 
        : (staticCopy?.sizes || []),
      details: staticCopy?.details || dbProduct.details || ["Premium handcrafted fabric", "Made in India"],
    } as Product;
  })();

  const [activeImage, setActiveImage] = useState<string>(product?.images?.[0] || "");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"details" | "shipping">("details");
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);

  // Reviews & Ratings state variables
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true);
  const [reviewsPage, setReviewsPage] = useState<number>(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState<number>(1);
  const [reviewsSort, setReviewsSort] = useState<string>("recent");
  const [ratingSummary, setRatingSummary] = useState<any | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<{
    hasPurchased: boolean;
    hasReviewed: boolean;
    existingReview: any | null;
  }>({
    hasPurchased: false,
    hasReviewed: false,
    existingReview: null
  });
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // Review form state
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [newReviewText, setNewReviewText] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Helper to render stars beautifully (filled / outline)
  const renderStars = (rating: number) => {
    const roundedRating = Math.round(rating);
    return (
      <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              fontSize: "14px",
              color: star <= roundedRating ? "var(--color-ruby)" : "var(--color-outline-variant)",
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Helper to format Date beautifully (Indian English locale: e.g. "14 June 2026")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // Fetch current user details
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res?.status === 'success' && res.data) {
        setCurrentUser(res.data);
      }
    } catch (err) {
      setCurrentUser(null);
    }
  };

  // Fetch reviews list
  const fetchReviews = async (page: number) => {
    if (!dbProduct?.id) return;
    setReviewsLoading(true);
    try {
      const res = await api.get(`/reviews/product/${dbProduct.id}?page=${page}&limit=5&sort=${reviewsSort}`);
      if (res?.status === 'success') {
        setReviews(res.data);
        if (res.pagination) {
          setReviewsPage(res.pagination.page);
          setReviewsTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Fetch rating summary
  const fetchRatingSummary = async () => {
    if (!dbProduct?.id) return;
    try {
      const res = await api.get(`/reviews/product/${dbProduct.id}/summary`);
      if (res?.status === 'success') {
        setRatingSummary(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch rating summary:", err);
    }
  };

  // Check purchase and review status
  const checkUserPurchaseAndReviewStatus = async () => {
    if (!dbProduct?.id) return;
    try {
      const res = await api.get(`/reviews/check-purchase/${dbProduct.id}`);
      if (res?.status === 'success') {
        setPurchaseStatus(res.data);
      }
    } catch (err) {
      setPurchaseStatus({
        hasPurchased: false,
        hasReviewed: false,
        existingReview: null
      });
    }
  };

  // Submit Review (Create or Update)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbProduct?.id) return;
    if (selectedRating < 1 || selectedRating > 5) {
      setReviewError("Please select a star rating between 1 and 5.");
      return;
    }
    if (newReviewText.length < 10 || newReviewText.length > 1000) {
      setReviewError("Review must be between 10 and 1000 characters.");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      let res;
      if (editingReviewId) {
        res = await api.put(`/reviews/${editingReviewId}`, {
          rating: selectedRating,
          reviewText: newReviewText
        });
      } else {
        res = await api.post('/reviews', {
          productId: dbProduct.id,
          rating: selectedRating,
          reviewText: newReviewText
        });
      }

      if (res?.status === 'success') {
        setReviewSuccess(editingReviewId ? "Review updated successfully!" : "Review submitted successfully!");
        setSelectedRating(0);
        setNewReviewText("");
        setEditingReviewId(null);
        
        // Refresh reviews and summary
        await fetchRatingSummary();
        await fetchReviews(1);
        await checkUserPurchaseAndReviewStatus();
      }
    } catch (err: any) {
      setReviewError(err.response?.data?.message || err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Start Edit Review
  const handleStartEdit = (review: any) => {
    setEditingReviewId(review.id);
    setSelectedRating(review.rating);
    setNewReviewText(review.reviewText);
    setReviewError(null);
    setReviewSuccess(null);
    
    // Scroll form into view
    const formElement = document.getElementById("review-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await api.delete(`/reviews/${reviewId}`);
      if (res?.status === 'success') {
        alert("Review deleted successfully.");
        // Refresh
        await fetchRatingSummary();
        await fetchReviews(1);
        await checkUserPurchaseAndReviewStatus();
        if (editingReviewId === reviewId) {
          setEditingReviewId(null);
          setSelectedRating(0);
          setNewReviewText("");
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete review.");
    }
  };

  // Moderate Review (Hide / Show)
  const handleModerateReview = async (reviewId: string, currentHidden: boolean) => {
    try {
      const res = await api.patch(`/reviews/${reviewId}/moderate`, {
        isHidden: !currentHidden
      });
      if (res?.status === 'success') {
        alert(currentHidden ? "Review is now visible." : "Review is now hidden.");
        await fetchRatingSummary();
        await fetchReviews(reviewsPage);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to moderate review.");
    }
  };

  const handleSortChange = (newSort: string) => {
    setReviewsSort(newSort);
    setReviewsPage(1);
  };

  // Initial user fetch
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Fetch product ratings/reviews when product or sort changes
  useEffect(() => {
    if (!dbProduct?.id) return;
    fetchRatingSummary();
    fetchReviews(1);
    checkUserPurchaseAndReviewStatus();
  }, [dbProduct?.id, reviewsSort]);

  // Fetch reviews when page changes
  useEffect(() => {
    if (!dbProduct?.id) return;
    fetchReviews(reviewsPage);
  }, [reviewsPage]);

  useEffect(() => {
    if (product && product.images && product.images.length > 0) {
      setActiveImage(product.images[0]);
    }
  }, [product]);

  const { addToCart, toggleCart, cartItems } = useCart();

  // Get other 3 products for the related section dynamically from database
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.get("/products")
      .then((res: any) => {
        const productList = res.data || [];
        const filtered = productList
          .filter((p: any) => p.id !== id)
          .slice(0, 3)
          .map(mapBackendProduct);
        setRelatedProducts(filtered);
      })
      .catch((err) => {
        console.error("Failed to fetch related products from database:", err);
      });
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-cream)",
          color: "var(--color-charcoal)",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Calibrating Deevuh Details...
        </div>
      </div>
    );
  }

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

              {ratingSummary ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {ratingSummary.totalCount > 0 ? (
                    <>
                      {renderStars(ratingSummary.averageRating)}
                      <span style={{ fontSize: "13px", color: "var(--color-on-surface-variant)", fontWeight: 500 }}>
                        {ratingSummary.averageRating} ({ratingSummary.totalCount} {ratingSummary.totalCount === 1 ? 'Review' : 'Reviews'})
                      </span>
                    </>
                  ) : (
                    <>
                      {renderStars(0)}
                      <span style={{ fontSize: "13px", color: "var(--color-on-surface-variant)", fontWeight: 500 }}>
                        No reviews yet
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "var(--color-on-surface-variant)", fontWeight: 500 }}>
                    Loading ratings...
                  </span>
                </div>
              )}
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
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Select Size
                  </span>
                  {["baby-blue-coordset", "beige-outfit", "dupatta-beige-outfit", "brown-coordset"].includes(product.id) && (
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-ruby)",
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: 0,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Size Guide
                    </button>
                  )}
                </div>
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

      {/* ════════ REVIEWS SECTION ════════ */}
      <section
        style={{
          borderTop: "1px solid var(--color-outline-variant)",
          padding: "80px 0",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <div className="container">
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "28px",
              fontWeight: 600,
              color: "var(--color-charcoal)",
              marginBottom: "48px",
              textAlign: "center",
              letterSpacing: "0.05em",
            }}
          >
            CUSTOMER REVIEWS
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "48px",
            }}
          >
            {/* Split layout on wider screens: summary left, reviews right */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "48px",
                alignItems: "start",
              }}
            >
              {/* LEFT COLUMN: SUMMARY STATISTICS */}
              <div
                style={{
                  border: "1px solid var(--color-outline-variant)",
                  padding: "32px",
                  backgroundColor: "var(--color-cream)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--color-charcoal)",
                    margin: 0,
                    borderBottom: "1px solid var(--color-outline-variant)",
                    paddingBottom: "16px",
                  }}
                >
                  Rating Summary
                </h3>

                {ratingSummary && ratingSummary.totalCount > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                      <span
                        style={{
                          fontSize: "48px",
                          fontWeight: 700,
                          color: "var(--color-ruby)",
                          fontFamily: "var(--font-serif)",
                        }}
                      >
                        {ratingSummary.averageRating}
                      </span>
                      <span style={{ fontSize: "16px", color: "var(--color-on-surface-variant)" }}>
                        out of 5
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {renderStars(ratingSummary.averageRating)}
                      <span style={{ fontSize: "14px", color: "var(--color-on-surface-variant)", fontWeight: 500 }}>
                        Based on {ratingSummary.totalCount} {ratingSummary.totalCount === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>

                    {/* Breakdown bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = ratingSummary.breakdown[stars]?.count || 0;
                        const percentage = ratingSummary.breakdown[stars]?.percentage || 0;
                        return (
                          <div key={stars} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                            <span
                              style={{
                                width: "60px",
                                textAlign: "left",
                                color: "var(--color-charcoal)",
                                fontWeight: 600,
                              }}
                            >
                              {stars} {stars === 1 ? 'star' : 'stars'}
                            </span>
                            <div
                              style={{
                                flex: 1,
                                height: "8px",
                                backgroundColor: "var(--color-outline-variant)",
                                borderRadius: "0px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${percentage}%`,
                                  height: "100%",
                                  backgroundColor: "var(--color-ruby)",
                                  transition: "width 0.5s ease-out",
                                }}
                              />
                            </div>
                            <span style={{ width: "35px", textAlign: "right", color: "var(--color-on-surface-variant)", fontWeight: 500 }}>
                              {percentage}%
                            </span>
                            <span style={{ width: "30px", color: "var(--color-on-surface-variant)", fontSize: "11px", textAlign: "right" }}>
                              ({count})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : ratingSummary ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--color-on-surface-variant)" }}>
                      No reviews yet. Be the first to review this product!
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--color-on-surface-variant)" }}>
                      Loading rating summary...
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: REVIEW LIST & SUBMISSION FORM */}
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {/* WRITE REVIEW FORM SECTION */}
                {purchaseStatus.hasPurchased && !purchaseStatus.hasReviewed && !editingReviewId && (
                  <div
                    id="review-form-container"
                    style={{
                      border: "1px solid var(--color-outline-variant)",
                      padding: "32px",
                      backgroundColor: "var(--color-cream)",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "var(--color-charcoal)",
                        margin: "0 0 20px 0",
                        borderBottom: "1px solid var(--color-outline-variant)",
                        paddingBottom: "12px",
                      }}
                    >
                      Write a Review
                    </h3>
                    
                    <form onSubmit={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
                          Select Rating *
                        </label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setSelectedRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                fontSize: "28px",
                                color: (hoverRating !== null ? star <= hoverRating : star <= selectedRating)
                                  ? "var(--color-ruby)"
                                  : "var(--color-outline-variant)",
                                transition: "color 0.15s ease",
                              }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="reviewText" style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
                          Your Feedback *
                        </label>
                        <textarea
                          id="reviewText"
                          value={newReviewText}
                          onChange={(e) => setNewReviewText(e.target.value)}
                          placeholder="Share your thoughts on Deevuh's design, premium fabric feel, and overall fit..."
                          required
                          style={{
                            width: "100%",
                            minHeight: "120px",
                            padding: "12px",
                            border: "1px solid var(--color-outline-variant)",
                            backgroundColor: "var(--color-surface)",
                            color: "var(--color-charcoal)",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            lineHeight: "1.6",
                            resize: "vertical",
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "var(--color-on-surface-variant)" }}>
                          <span>Minimum 10 characters</span>
                          <span style={{ color: newReviewText.length < 10 || newReviewText.length > 1000 ? "var(--color-ruby)" : "inherit" }}>
                            {newReviewText.length} / 1000 characters
                          </span>
                        </div>
                      </div>

                      {reviewError && (
                        <div style={{ color: "var(--color-ruby)", fontSize: "13px", fontWeight: 600 }}>
                          {reviewError}
                        </div>
                      )}

                      {reviewSuccess && (
                        <div style={{ color: "green", fontSize: "13px", fontWeight: 600 }}>
                          {reviewSuccess}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingReview}
                        style={{
                          alignSelf: "flex-start",
                          padding: "14px 28px",
                          backgroundColor: "var(--color-ruby)",
                          color: "var(--color-cream)",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          transition: "opacity 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                    </form>
                  </div>
                )}

                {/* EDITING FORM SECTION */}
                {editingReviewId && (
                  <div
                    id="review-form-container"
                    style={{
                      border: "1px solid var(--color-ruby)",
                      padding: "32px",
                      backgroundColor: "var(--color-cream)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--color-outline-variant)", paddingBottom: "12px" }}>
                      <h3
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "20px",
                          fontWeight: 600,
                          color: "var(--color-charcoal)",
                          margin: 0,
                        }}
                      >
                        Edit Your Review
                      </h3>
                      <button
                        onClick={() => {
                          setEditingReviewId(null);
                          setSelectedRating(0);
                          setNewReviewText("");
                          setReviewError(null);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-ruby)",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Cancel Edit
                      </button>
                    </div>
                    
                    <form onSubmit={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
                          Select Rating *
                        </label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setSelectedRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                fontSize: "28px",
                                color: (hoverRating !== null ? star <= hoverRating : star <= selectedRating)
                                  ? "var(--color-ruby)"
                                  : "var(--color-outline-variant)",
                                transition: "color 0.15s ease",
                              }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="editReviewText" style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
                          Your Feedback *
                        </label>
                        <textarea
                          id="editReviewText"
                          value={newReviewText}
                          onChange={(e) => setNewReviewText(e.target.value)}
                          placeholder="Share your thoughts on Deevuh's design, premium fabric feel, and overall fit..."
                          required
                          style={{
                            width: "100%",
                            minHeight: "120px",
                            padding: "12px",
                            border: "1px solid var(--color-outline-variant)",
                            backgroundColor: "var(--color-surface)",
                            color: "var(--color-charcoal)",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            lineHeight: "1.6",
                            resize: "vertical",
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "var(--color-on-surface-variant)" }}>
                          <span>Minimum 10 characters</span>
                          <span style={{ color: newReviewText.length < 10 || newReviewText.length > 1000 ? "var(--color-ruby)" : "inherit" }}>
                            {newReviewText.length} / 1000 characters
                          </span>
                        </div>
                      </div>

                      {reviewError && (
                        <div style={{ color: "var(--color-ruby)", fontSize: "13px", fontWeight: 600 }}>
                          {reviewError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingReview}
                        style={{
                          alignSelf: "flex-start",
                          padding: "14px 28px",
                          backgroundColor: "var(--color-ruby)",
                          color: "var(--color-cream)",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {submittingReview ? "Updating..." : "Update Review"}
                      </button>
                    </form>
                  </div>
                )}

                {/* LOG IN ENCOURAGEMENT */}
                {!currentUser && (
                  <div
                    style={{
                      border: "1px solid var(--color-outline-variant)",
                      padding: "24px",
                      backgroundColor: "var(--color-cream)",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--color-on-surface-variant)" }}>
                      Have you purchased this piece? Log in to share your experience with the collection.
                    </p>
                    <Link
                      href="/login"
                      style={{
                        display: "inline-block",
                        padding: "10px 20px",
                        backgroundColor: "var(--color-charcoal)",
                        color: "var(--color-cream)",
                        textDecoration: "none",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      Log In to Review
                    </Link>
                  </div>
                )}

                {/* VERIFIED PURCHASER BADGE / NO ORDER NOTE */}
                {currentUser && !purchaseStatus.hasPurchased && (
                  <div
                    style={{
                      border: "1px solid var(--color-outline-variant)",
                      padding: "20px",
                      backgroundColor: "var(--color-cream)",
                      fontSize: "13px",
                      color: "var(--color-on-surface-variant)",
                      textAlign: "center",
                    }}
                  >
                    Only customers who have purchased this signature piece can leave a review.
                  </div>
                )}

                {/* ALREADY REVIEWED NOTE */}
                {currentUser && purchaseStatus.hasReviewed && !editingReviewId && (
                  <div
                    style={{
                      border: "1px solid var(--color-outline-variant)",
                      padding: "24px",
                      backgroundColor: "var(--color-cream)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      alignItems: "center",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-charcoal)" }}>
                      You have already reviewed this product.
                    </span>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <button
                        onClick={() => handleStartEdit(purchaseStatus.existingReview)}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "transparent",
                          border: "1px solid var(--color-charcoal)",
                          color: "var(--color-charcoal)",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Edit Review
                      </button>
                      <button
                        onClick={() => handleDeleteReview(purchaseStatus.existingReview.id)}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "transparent",
                          border: "1px solid var(--color-ruby)",
                          color: "var(--color-ruby)",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Delete Review
                      </button>
                    </div>
                  </div>
                )}

                {/* LIST OF REVIEWS AND CONTROLS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid var(--color-outline-variant)",
                      paddingBottom: "16px",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "var(--color-charcoal)",
                        margin: 0,
                      }}
                    >
                      Reviews ({ratingSummary?.totalCount || 0})
                    </h3>

                    {/* Sorting dropdown */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label htmlFor="reviews-sort" style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Sort By:
                      </label>
                      <select
                        id="reviews-sort"
                        value={reviewsSort}
                        onChange={(e) => handleSortChange(e.target.value)}
                        style={{
                          padding: "6px 12px",
                          border: "1px solid var(--color-outline-variant)",
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-charcoal)",
                          fontSize: "12px",
                          outline: "none",
                          borderRadius: "0px",
                          cursor: "pointer",
                        }}
                      >
                        <option value="recent">Most Recent</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                      </select>
                    </div>
                  </div>

                  {reviewsLoading ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <span style={{ fontSize: "14px", color: "var(--color-on-surface-variant)" }}>
                        Loading customer reviews...
                      </span>
                    </div>
                  ) : reviews.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      {reviews.map((rev) => {
                        const isOwner = currentUser?.id === rev.userId;
                        const isAdmin = currentUser?.role === "ADMIN";
                        return (
                          <div
                            key={rev.id}
                            style={{
                              padding: "24px",
                              border: "1px solid var(--color-outline-variant)",
                              backgroundColor: rev.isHidden ? "rgba(220, 53, 69, 0.05)" : "var(--color-surface)",
                              position: "relative",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                              transition: "background-color 0.2s",
                            }}
                          >
                            {/* Top row: Name, Date, Stars */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "12px" }}>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--color-charcoal)", display: "block", marginBottom: "4px" }}>
                                  {rev.user?.name || "Verified Customer"}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {renderStars(rev.rating)}
                                  {rev.verifiedPurchase && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        backgroundColor: "rgba(88, 47, 52, 0.1)",
                                        color: "var(--color-ruby)",
                                        padding: "2px 8px",
                                        letterSpacing: "0.05em",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      ✓ Verified Purchase
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>
                                {formatDate(rev.createdAt)}
                              </span>
                            </div>

                            {/* Review Content */}
                            <p
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                lineHeight: "1.7",
                                color: "var(--color-charcoal)",
                                wordBreak: "break-word",
                                whiteSpace: "pre-line",
                              }}
                            >
                              {rev.reviewText}
                            </p>

                            {/* Admin hidden notification */}
                            {rev.isHidden && (
                              <div style={{ color: "var(--color-ruby)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                ⚠️ Hidden by Moderator
                              </div>
                            )}

                            {/* Actions row: edit, delete, moderate */}
                            {(isOwner || isAdmin) && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "16px",
                                  borderTop: "1px solid var(--color-outline-variant)",
                                  paddingTop: "12px",
                                  marginTop: "4px",
                                  fontSize: "12px",
                                }}
                              >
                                {isOwner && (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(rev)}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--color-charcoal)",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        padding: 0,
                                        textDecoration: "underline",
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReview(rev.id)}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--color-ruby)",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        padding: 0,
                                        textDecoration: "underline",
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}

                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleModerateReview(rev.id, rev.isHidden)}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "orange",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        padding: 0,
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {rev.isHidden ? "Unhide" : "Hide (Moderate)"}
                                    </button>
                                    {!isOwner && (
                                      <button
                                        onClick={() => handleDeleteReview(rev.id)}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "red",
                                          cursor: "pointer",
                                          fontWeight: 600,
                                          padding: 0,
                                          textDecoration: "underline",
                                        }}
                                      >
                                        Delete (Spam)
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Pagination Controls */}
                      {reviewsTotalPages > 1 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "16px",
                            marginTop: "12px",
                          }}
                        >
                          <button
                            onClick={() => setReviewsPage((p) => Math.max(p - 1, 1))}
                            disabled={reviewsPage === 1}
                            style={{
                              padding: "8px 16px",
                              border: "1px solid var(--color-outline-variant)",
                              backgroundColor: "transparent",
                              color: "var(--color-charcoal)",
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              cursor: "pointer",
                              opacity: reviewsPage === 1 ? 0.4 : 1,
                            }}
                          >
                            Previous
                          </button>
                          
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-on-surface-variant)" }}>
                            Page {reviewsPage} of {reviewsTotalPages}
                          </span>

                          <button
                            onClick={() => setReviewsPage((p) => Math.min(p + 1, reviewsTotalPages))}
                            disabled={reviewsPage === reviewsTotalPages}
                            style={{
                              padding: "8px 16px",
                              border: "1px solid var(--color-outline-variant)",
                              backgroundColor: "transparent",
                              color: "var(--color-charcoal)",
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              cursor: "pointer",
                              opacity: reviewsPage === reviewsTotalPages ? 0.4 : 1,
                            }}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "48px",
                        border: "1px solid var(--color-outline-variant)",
                        backgroundColor: "var(--color-surface)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-charcoal)" }}>
                        No reviews yet
                      </span>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--color-on-surface-variant)" }}>
                        {purchaseStatus.hasPurchased
                          ? "Be the first to review this tailormade outfit! Your feedback keeps our capsule collection divine."
                          : "Encourage customer reviews by leaving the very first one if you have purchased this piece."}
                      </p>
                    </div>
                  )}
                </div>
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

      {showSizeGuide && ["baby-blue-coordset", "beige-outfit", "dupatta-beige-outfit", "brown-coordset"].includes(product.id) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(8px)",
            padding: "20px",
          }}
          onClick={() => setShowSizeGuide(false)}
        >
          <div
            style={{
              backgroundColor: "var(--color-cream)",
              border: "1px solid var(--color-outline-variant)",
              maxWidth: "600px",
              width: "100%",
              padding: "40px",
              boxShadow: "0 24px 48px rgba(44, 44, 44, 0.15)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSizeGuide(false)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "var(--color-charcoal)",
                cursor: "pointer",
                padding: "4px",
                lineHeight: 1,
                zIndex: 10,
              }}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--color-ruby)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                DEEVUH
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-charcoal)",
                  margin: "0 0 4px 0",
                }}
              >
                {product.title}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--color-on-surface-variant)",
                  margin: 0,
                }}
              >
                Official Size Guide
              </p>
            </div>

            {product.id === "baby-blue-coordset" ? (
              <>
                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "12px",
                      textAlign: "center",
                      border: "1px solid var(--color-outline-variant)",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#582f34", color: "var(--color-cream)" }}>
                        <th style={{ padding: "12px 8px", fontWeight: 700, fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Size</th>
                        <th style={{ padding: "12px 8px", fontWeight: 700, fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Bust (Top)</th>
                        <th style={{ padding: "12px 8px", fontWeight: 700, fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>High Waist (Skirt Start)</th>
                        <th style={{ padding: "12px 8px", fontWeight: 700, fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Normal Waist (Reference)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { size: "XS", bust: "30\"", highWaist: "26\"", normalWaist: "28\"" },
                        { size: "S", bust: "32\"", highWaist: "28\"", normalWaist: "30\"" },
                        { size: "M", bust: "34\"", highWaist: "30\"", normalWaist: "32\"" },
                        { size: "L", bust: "36\"", highWaist: "34\"", normalWaist: "36\"" },
                      ].map((row) => (
                        <tr key={row.size} style={{ color: "var(--color-charcoal)" }}>
                          <td style={{ padding: "12px 8px", fontWeight: 700, border: "1px solid var(--color-outline-variant)" }}>{row.size}</td>
                          <td style={{ padding: "12px 8px", border: "1px solid var(--color-outline-variant)" }}>{row.bust}</td>
                          <td style={{ padding: "12px 8px", border: "1px solid var(--color-outline-variant)" }}>{row.highWaist}</td>
                          <td style={{ padding: "12px 8px", border: "1px solid var(--color-outline-variant)" }}>{row.normalWaist}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fit Tips */}
                <div
                  style={{
                    border: "1px solid var(--color-outline-variant)",
                    padding: "20px",
                    backgroundColor: "rgba(44, 44, 44, 0.02)",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-ruby)",
                      marginBottom: "12px",
                      marginTop: 0,
                    }}
                  >
                    Designer Fit Tips:
                  </h4>
                  <ul
                    style={{
                      paddingLeft: "16px",
                      margin: 0,
                      fontSize: "12px",
                      lineHeight: "1.7",
                      color: "var(--color-charcoal)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <li><strong>SKIRT IS DESIGNED TO SIT EXACTLY</strong>, starting precisely at your upper waist.</li>
                    <li><strong>'NORMAL WAIST' IS INCLUDED</strong> so you can easily reference your standard sizing.</li>
                    <li><strong>PRIORITIZE YOUR UPPER WAIST</strong>, prioritize its exact Upper Waist measurement.</li>
                  </ul>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* 1. TOP MEASUREMENTS */}
                <div>
                  <h3
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-ruby)",
                      marginBottom: "12px",
                    }}
                  >
                    1. Co-ord Set Top Measurements
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "12px",
                        textAlign: "center",
                        border: "1px solid var(--color-outline-variant)",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#582f34", color: "var(--color-cream)" }}>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Size</th>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Top Length</th>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Chest (Bust)</th>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Waist</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows = [
                            { size: "XS", length: "19\"", bust: "30\"", waist: "28\"" },
                            { size: "S", length: "20\"", bust: "32\"", waist: "30\"" },
                            { size: "M", length: "20.5\"", bust: "34\"", waist: "32\"" },
                            { size: "L", length: "21\"", bust: "36\"", waist: "34\"" },
                          ];
                          if (product.id === "brown-coordset") {
                            rows.push(
                              { size: "XL", length: "21.5\"", bust: "38\"", waist: "36\"" },
                              { size: "XXL", length: "22\"", bust: "40\"", waist: "38\"" }
                            );
                          }
                          return rows.map((row) => (
                            <tr key={row.size} style={{ color: "var(--color-charcoal)" }}>
                              <td style={{ padding: "10px 6px", fontWeight: 700, border: "1px solid var(--color-outline-variant)" }}>{row.size}</td>
                              <td style={{ padding: "10px 6px", border: "1px solid var(--color-outline-variant)" }}>{row.length}</td>
                              <td style={{ padding: "10px 6px", border: "1px solid var(--color-outline-variant)" }}>{row.bust}</td>
                              <td style={{ padding: "10px 6px", border: "1px solid var(--color-outline-variant)" }}>{row.waist}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. PANTS MEASUREMENTS */}
                <div>
                  <h3
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-ruby)",
                      marginBottom: "12px",
                    }}
                  >
                    2. Co-ord Set Pants Measurements
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "12px",
                        textAlign: "center",
                        border: "1px solid var(--color-outline-variant)",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#582f34", color: "var(--color-cream)" }}>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Size</th>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Pant Waist</th>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Pant Hip</th>
                          <th style={{ padding: "10px 6px", fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em", textTransform: "uppercase", border: "1px solid var(--color-outline-variant)" }}>Pant Length</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows = product.id === "brown-coordset" ? [
                            { size: "XS", waist: "26\"", hip: "34\"", length: "41\"" },
                            { size: "S", waist: "28\"", hip: "36\"", length: "41\"" },
                            { size: "M", waist: "30\"", hip: "38\"", length: "41\"" },
                            { size: "L", waist: "32\"", hip: "40\"", length: "41\"" },
                            { size: "XL", waist: "34\"", hip: "42\"", length: "41\"" },
                            { size: "XXL", waist: "36\"", hip: "44\"", length: "41\"" },
                          ] : [
                            { size: "XS", waist: "26\"", hip: "34\"", length: "40\"" },
                            { size: "S", waist: "28\"", hip: "36\"", length: "40\"" },
                            { size: "M", waist: "30\"", hip: "38\"", length: "40\"" },
                            { size: "L", waist: "32\"", hip: "40\"", length: "40\"" },
                          ];
                          return rows.map((row) => (
                            <tr key={row.size} style={{ color: "var(--color-charcoal)" }}>
                              <td style={{ padding: "10px 6px", fontWeight: 700, border: "1px solid var(--color-outline-variant)" }}>{row.size}</td>
                              <td style={{ padding: "10px 6px", border: "1px solid var(--color-outline-variant)" }}>{row.waist}</td>
                              <td style={{ padding: "10px 6px", border: "1px solid var(--color-outline-variant)" }}>{row.hip}</td>
                              <td style={{ padding: "10px 6px", border: "1px solid var(--color-outline-variant)" }}>{row.length}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
