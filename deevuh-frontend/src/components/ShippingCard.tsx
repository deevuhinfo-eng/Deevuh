interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface ShippingCardProps {
  addr: ShippingAddress;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
}

export default function ShippingCard({ addr, selected = false, onSelect, onEdit }: ShippingCardProps) {
  return (
    <div
      className="card"
      onClick={onSelect}
      style={{
        cursor: onSelect ? 'pointer' : 'default',
        borderColor: selected ? 'var(--color-ruby)' : 'var(--color-outline-variant)',
        borderWidth: selected ? '2px' : '1px',
        position: 'relative',
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'var(--color-ruby)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
        }}>
          ✓
        </div>
      )}

      <div className="stack-sm">
        <h4 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
          {addr.fullName}
        </h4>
        <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
          {addr.phone}
        </p>
        <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
          {addr.line1}
          {addr.line2 && <><br />{addr.line2}</>}
          <br />
          {addr.city}, {addr.state} — {addr.pincode}
        </p>
      </div>

      {onEdit && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{ marginTop: '12px' }}
        >
          Edit
        </button>
      )}
    </div>
  );
}
