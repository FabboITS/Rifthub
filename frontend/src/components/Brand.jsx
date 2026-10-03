/** Marchio RiftHub: la top lane (L) e la mid lane (diagonale) di una minimappa. */
export function BrandMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: "none" }}>
      <rect width="32" height="32" rx="6" fill="#0c0908" stroke="rgba(255,140,70,.35)" />
      <path d="M8 25 V8 H25" fill="none" stroke="#ff6b1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 22.5 L22.5 10.5" stroke="#ffb547" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25" cy="25" r="2.2" fill="#5aa9ff" />
    </svg>
  );
}

export function Brand({ size = 28 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, font: `900 ${Math.round(size * 0.82)}px/1 var(--font-display)`, color: "var(--bone)", letterSpacing: ".01em" }}>
      <BrandMark size={size} /> RiftHub
    </span>
  );
}
