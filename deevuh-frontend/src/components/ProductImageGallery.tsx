"use client";

import React, { useRef, useEffect, useState, useCallback, memo } from "react";

interface ProductImageGalleryProps {
  images: string[];
  title: string;
  onActiveIndexChange?: (index: number) => void;
}

/**
 * ProductImageGallery — Premium native-like swipeable product image gallery
 * 
 * Behave exactly like Amazon, Myntra, Nike, Zara, and iOS Photos.
 * Uses Pointer Events with 1:1 hardware-accelerated transforms, elastic edge resistance,
 * and high-performance velocity/swipe threshold release physics.
 */
const ProductImageGallery = memo(function ProductImageGallery({
  images,
  title,
  onActiveIndexChange,
}: ProductImageGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  // Keep track of swipe state using refs to avoid React state re-renders during drags
  const gestureState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    isSwipeDetermined: false,
    isHorizontalSwipe: false,
    trackWidth: 0,
  });

  // Apply visual transform to the track node
  const setTrackTransform = useCallback((offsetX: number, withTransition = false) => {
    if (!trackRef.current) return;
    const baseOffset = -activeIndex * 100;
    
    if (withTransition) {
      trackRef.current.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";
    } else {
      trackRef.current.style.transition = "none";
    }
    
    // Using percentage for base layout and direct px for drag offset to handle screen resizes beautifully
    trackRef.current.style.transform = `translate3d(calc(${baseOffset}% + ${offsetX}px), 0, 0)`;
  }, [activeIndex]);

  // Adjust active slide index
  const goToSlide = useCallback((index: number) => {
    const validIndex = Math.max(0, Math.min(index, images.length - 1));
    setActiveIndex(validIndex);
    onActiveIndexChange?.(validIndex);
  }, [images.length, onActiveIndexChange]);

  // Handle slide update when index changes
  useEffect(() => {
    setTrackTransform(0, true);
  }, [activeIndex, setTrackTransform]);

  // Pointer Event listeners
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let rafId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      // Allow only primary button clicks or touch pointers
      if (e.button !== 0 && e.pointerType !== "touch") return;

      const state = gestureState.current;
      state.isDragging = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.currentX = e.clientX;
      state.currentY = e.clientY;
      state.startTime = Date.now();
      state.isSwipeDetermined = false;
      state.isHorizontalSwipe = false;
      state.trackWidth = track.clientWidth;

      // Remove transition on drag start
      track.style.transition = "none";
    };

    const onPointerMove = (e: PointerEvent) => {
      const state = gestureState.current;
      if (!state.isDragging) return;

      state.currentX = e.clientX;
      state.currentY = e.clientY;

      const deltaX = state.currentX - state.startX;
      const deltaY = state.currentY - state.startY;

      // Determine swipe direction if not already done
      if (!state.isSwipeDetermined) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX > 8 || absY > 8) {
          state.isSwipeDetermined = true;
          if (absX > absY) {
            state.isHorizontalSwipe = true;
            // Prevent pointer capture to avoid page scrolling during swipe
            if (track.hasPointerCapture(e.pointerId)) {
              track.releasePointerCapture(e.pointerId);
            }
          }
        }
      }

      if (state.isHorizontalSwipe) {
        // Prevent browser scrolling behavior
        if (e.cancelable) e.preventDefault();

        // Calculate drag offset with iOS-like elastic edge resistance
        let dragOffset = deltaX;
        if (activeIndex === 0 && deltaX > 0) {
          dragOffset = deltaX * 0.35; // Resistance going past first item
        } else if (activeIndex === images.length - 1 && deltaX < 0) {
          dragOffset = deltaX * 0.35; // Resistance going past last item
        }

        // Schedule visual transform update on next frame
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setTrackTransform(dragOffset, false);
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const state = gestureState.current;
      if (!state.isDragging) return;
      state.isDragging = false;

      if (rafId) cancelAnimationFrame(rafId);

      if (state.isHorizontalSwipe) {
        const deltaX = state.currentX - state.startX;
        const duration = Date.now() - state.startTime;
        const velocityX = deltaX / (duration || 1); // px per ms

        const threshold = state.trackWidth * 0.25;
        const speedThreshold = 0.45; // px/ms for quick flicks

        if (deltaX < -threshold || velocityX < -speedThreshold) {
          // Swipe left -> next slide
          if (activeIndex < images.length - 1) {
            goToSlide(activeIndex + 1);
          } else {
            setTrackTransform(0, true);
          }
        } else if (deltaX > threshold || velocityX > speedThreshold) {
          // Swipe right -> prev slide
          if (activeIndex > 0) {
            goToSlide(activeIndex - 1);
          } else {
            setTrackTransform(0, true);
          }
        } else {
          // Reset to current slide
          setTrackTransform(0, true);
        }
      }

      state.isSwipeDetermined = false;
      state.isHorizontalSwipe = false;
    };

    // Attach listeners
    track.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      track.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeIndex, images.length, goToSlide, setTrackTransform]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" && activeIndex > 0) {
        e.preventDefault();
        goToSlide(activeIndex - 1);
      } else if (e.key === "ArrowRight" && activeIndex < images.length - 1) {
        e.preventDefault();
        goToSlide(activeIndex + 1);
      }
    },
    [activeIndex, images.length, goToSlide]
  );

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

  // Handle empty images gracefully
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
      {/* ═══ Gesture-Driven Slider Container ═══ */}
      <div
        style={{
          width: "100%",
          overflow: "hidden",
          position: "relative",
          border: "1px solid var(--color-outline-variant)",
          backgroundColor: "#eaeaea",
        }}
      >
        {/* Track */}
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
            position: "relative",
            width: "100%",
            transform: "translate3d(0, 0, 0)",
            touchAction: "pan-y pinch-zoom",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              role="group"
              aria-roledescription="slide"
              aria-label={`Image ${idx + 1} of ${images.length}`}
              className="product-gallery-slide"
              style={{
                minWidth: "100%",
                width: "100%",
                flexShrink: 0,
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
                  onError={() => setBrokenImages((prev) => new Set(prev).add(idx))}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    pointerEvents: "none", // Prevent native drag behaviors on image itself
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Mobile: Dots Indicator + Counter ═══ */}
      {images.length > 1 && (
        <div
          className="product-gallery-mobile-indicators"
          style={{
            display: "none",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            padding: "4px 0",
          }}
        >
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
                onClick={() => goToSlide(idx)}
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
              onClick={() => goToSlide(idx)}
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
