"use client";

import React, { useRef, useEffect, useState, useCallback, memo } from "react";

interface ProductImageGalleryProps {
  images: string[];
  title: string;
  onActiveIndexChange?: (index: number) => void;
}

/**
 * ProductImageGallery — Premium swipeable product image gallery
 * 
 * Mobile: CSS scroll-snap based horizontal swipe with animated dots
 * Desktop: Click-to-select thumbnails with smooth scroll-to animation
 * 
 * Zero external dependencies. GPU-accelerated. Accessible.
 */
const ProductImageGallery = memo(function ProductImageGallery({
  images,
  title,
  onActiveIndexChange,
}: ProductImageGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  // Detect mobile viewport
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // IntersectionObserver to detect which slide is visible
  useEffect(() => {
    if (!trackRef.current || images.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!isNaN(idx)) {
              setActiveIndex(idx);
              onActiveIndexChange?.(idx);
            }
          }
        }
      },
      {
        root: trackRef.current,
        threshold: 0.5,
      }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observerRef.current!.observe(slide);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [images, onActiveIndexChange]);

  // Scroll to specific slide (used by thumbnails and keyboard nav)
  const scrollToSlide = useCallback(
    (index: number) => {
      if (!trackRef.current) return;
      const slideWidth = trackRef.current.clientWidth;
      trackRef.current.scrollTo({
        left: index * slideWidth,
        behavior: "smooth",
      });
    },
    []
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" && activeIndex > 0) {
        e.preventDefault();
        scrollToSlide(activeIndex - 1);
      } else if (e.key === "ArrowRight" && activeIndex < images.length - 1) {
        e.preventDefault();
        scrollToSlide(activeIndex + 1);
      }
    },
    [activeIndex, images.length, scrollToSlide]
  );

  // Image error handler
  const handleImageError = useCallback((index: number) => {
    setBrokenImages((prev) => new Set(prev).add(index));
  }, []);

  // Preload adjacent images
  useEffect(() => {
    const toPreload = [activeIndex - 1, activeIndex + 1].filter(
      (i) => i >= 0 && i < images.length && !brokenImages.has(i)
    );
    toPreload.forEach((i) => {
      const img = new Image();
      img.src = images[i];
    });
  }, [activeIndex, images, brokenImages]);

  // Handle zero images
  if (!images || images.length === 0) {
    return (
      <div
        style={{
          aspectRatio: "3/4",
          backgroundColor: "#eaeaea",
          border: "1px solid var(--color-outline-variant)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-on-surface-variant)",
          fontSize: "14px",
        }}
      >
        No images available
      </div>
    );
  }

  return (
    <div
      className="product-gallery"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      {/* ═══ Swipeable Gallery Track ═══ */}
      <div
        ref={trackRef}
        className="product-gallery-track"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} product images`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          position: "relative",
          border: "1px solid var(--color-outline-variant)",
          backgroundColor: "#eaeaea",
        }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            ref={(el) => { slideRefs.current[idx] = el; }}
            data-index={idx}
            role="group"
            aria-roledescription="slide"
            aria-label={`Image ${idx + 1} of ${images.length}`}
            className="product-gallery-slide"
            style={{
              minWidth: "100%",
              width: "100%",
              flexShrink: 0,
              scrollSnapAlign: "start",
              aspectRatio: "3/4",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {brokenImages.has(idx) ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f0eded",
                  color: "var(--color-on-surface-variant)",
                  fontSize: "13px",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "32px", opacity: 0.4 }}>⚠</span>
                <span>Image unavailable</span>
              </div>
            ) : (
              <img
                src={img}
                alt={`${title} — view ${idx + 1}`}
                loading={Math.abs(idx - activeIndex) <= 1 ? "eager" : "lazy"}
                onError={() => handleImageError(idx)}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  userSelect: "none",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ═══ Mobile: Dots Indicator + Counter ═══ */}
      {images.length > 1 && (
        <div
          className="product-gallery-mobile-indicators"
          style={{
            display: "none", /* shown via CSS on mobile */
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            padding: "4px 0",
          }}
        >
          {/* Dots */}
          <div
            className="product-gallery-dots"
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
            }}
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToSlide(idx)}
                aria-label={`Go to image ${idx + 1}`}
                className={`product-gallery-dot${idx === activeIndex ? " active" : ""}`}
                style={{
                  width: idx === activeIndex ? "20px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  backgroundColor:
                    idx === activeIndex
                      ? "var(--color-ruby)"
                      : "var(--color-outline-variant)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            ))}
          </div>

          {/* Counter */}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--color-on-surface-variant)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {activeIndex + 1} / {images.length}
          </span>
        </div>
      )}

      {/* ═══ Desktop: Thumbnail Gallery ═══ */}
      <div
        className="product-gallery-thumbnails"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "10px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {images.map((img, idx) => {
          const isActive = activeIndex === idx;
          return (
            <button
              key={idx}
              onClick={() => scrollToSlide(idx)}
              aria-label={`View image ${idx + 1}`}
              style={{
                aspectRatio: "3/4",
                overflow: "hidden",
                border: isActive
                  ? "2px solid var(--color-ruby)"
                  : "1px solid var(--color-outline-variant)",
                padding: 0,
                cursor: "pointer",
                backgroundColor: "#f5f5f5",
                transition: "border-color 0.2s",
              }}
            >
              {brokenImages.has(idx) ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f0eded",
                    fontSize: "18px",
                    opacity: 0.3,
                  }}
                >
                  ⚠
                </div>
              ) : (
                <img
                  src={img}
                  alt={`${title} thumbnail ${idx + 1}`}
                  loading="lazy"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: isActive ? 1 : 0.75,
                    transition: "opacity 0.2s",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default ProductImageGallery;
