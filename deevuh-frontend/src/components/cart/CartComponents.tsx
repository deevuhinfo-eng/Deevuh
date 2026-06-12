import { cloudinaryUrl } from '@/lib/cloudinary';

interface CartItemProps {
  item: {
    id: string;
    quantity: number;
    variant: {
      id: string;
      size: string;
      price: string;
      product: {
        title: string;
        images: Array<{ imageUrl: string }>;
      };
    };
  };
  onUpdateQty: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  onMoveToWishlist?: (productId: string) => void;
}

export function CartItem({ item, onUpdateQty, onRemove, onMoveToWishlist }: CartItemProps) {
  const imageUrl = item.variant.product.images[0]?.imageUrl;
  const itemTotal = Number(item.variant.price) * item.quantity;

  return (
    <div className="card" style={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: '80px',
        height: '100px',
        flexShrink: 0,
        overflow: 'hidden',
        background: 'var(--color-surface-container)',
      }}>
        {imageUrl && (
          <img
            src={cloudinaryUrl(imageUrl, { width: 160, quality: 'auto' })}
            alt={item.variant.product.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
            {item.variant.product.title}
          </h4>
          <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
            Size: {item.variant.size}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          {/* Quantity controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 10px', borderRadius: 0 }}
              onClick={() => onUpdateQty(item.id, item.quantity - 1)}
            >
              −
            </button>
            <span style={{
              padding: '4px 14px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid var(--color-outline-variant)',
              borderLeft: 'none',
              borderRight: 'none',
            }}>
              {item.quantity}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 10px', borderRadius: 0 }}
              onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            >
              +
            </button>
          </div>

          {/* Price */}
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            fontWeight: 600,
          }}>
            ₹{itemTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
        <button
          onClick={() => onRemove(item.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--color-on-surface-variant)',
            padding: '4px',
          }}
          title="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface CartSummaryProps {
  subtotal: number;
  couponDiscount?: number;
  couponCode?: string;
}

export function CartSummary({ subtotal, couponDiscount = 0, couponCode }: CartSummaryProps) {
  const total = subtotal - couponDiscount;

  return (
    <div className="card-elevated" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Order Summary</h3>

      <div className="stack-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span style={{ color: 'var(--color-on-surface-variant)' }}>Subtotal</span>
          <span>₹{subtotal.toLocaleString('en-IN')}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
          <span style={{ color: 'var(--color-on-surface-variant)' }}>Shipping Charges</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Free</span>
        </div>

        {couponDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: 'var(--color-success)' }}>
              Coupon ({couponCode})
            </span>
            <span style={{ color: 'var(--color-success)' }}>
              −₹{couponDiscount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <div style={{
          borderTop: '1px solid var(--color-outline-variant)',
          paddingTop: '12px',
          marginTop: '8px',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 600 }}>Total</span>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--color-charcoal)',
          }}>
            ₹{total.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
