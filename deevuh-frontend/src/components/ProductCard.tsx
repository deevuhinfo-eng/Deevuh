import { cloudinaryUrl } from '@/lib/cloudinary';

interface ProductImage {
  id: string;
  imageUrl: string;
}

interface ProductVariant {
  id: string;
  size: string;
  price: string;
  stockQty: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  basePrice: string;
  category: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

interface ProductCardProps {
  product: Product;
  onQuickAdd?: (variantId: string) => void;
}

export default function ProductCard({ product, onQuickAdd }: ProductCardProps) {
  const primaryImage = product.images[0]?.imageUrl;
  const lowestPrice = Math.min(...product.variants.map((v) => Number(v.price)));
  const basePrice = Number(product.basePrice);
  const hasDiscount = lowestPrice < basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((basePrice - lowestPrice) / basePrice) * 100)
    : 0;

  const defaultVariant = product.variants[0];

  return (
    <div className="card" style={{
      padding: 0,
      overflow: 'hidden',
      position: 'relative',
      transition: 'transform 0.2s ease',
    }}>
      {/* Sale Badge */}
      {hasDiscount && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          background: 'var(--color-ruby)',
          color: 'white',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {discountPercent}% OFF
        </div>
      )}

      {/* Image */}
      <div style={{
        width: '100%',
        aspectRatio: '3/4',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface-container)',
      }}>
        {primaryImage ? (
          <img
            src={cloudinaryUrl(primaryImage, { width: 640, quality: 'auto' })}
            alt={product.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-on-surface-variant)',
            fontSize: '14px',
          }}>
            No image
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '16px' }}>
        <span className="label-md" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '4px', display: 'block' }}>
          {product.category}
        </span>
        <h4 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px', lineHeight: 1.3 }}>
          {product.title}
        </h4>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
          <span style={{
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-charcoal)',
          }}>
            ₹{lowestPrice.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <span style={{
              fontSize: '14px',
              color: 'var(--color-on-surface-variant)',
              textDecoration: 'line-through',
            }}>
              ₹{basePrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Sizes */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {product.variants.map((v) => (
            <span
              key={v.id}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 500,
                border: '1px solid var(--color-outline-variant)',
                background: v.stockQty > 0 ? 'transparent' : 'var(--color-surface-dim)',
                color: v.stockQty > 0 ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                opacity: v.stockQty > 0 ? 1 : 0.5,
                textDecoration: v.stockQty > 0 ? 'none' : 'line-through',
              }}
            >
              {v.size}
            </span>
          ))}
        </div>

        {/* Quick Add */}
        {onQuickAdd && defaultVariant && defaultVariant.stockQty > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
            onClick={() => onQuickAdd(defaultVariant.id)}
          >
            Quick Add
          </button>
        )}
      </div>
    </div>
  );
}
