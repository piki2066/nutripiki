import type { CSSProperties } from 'react'

/**
 * Sello de marca "NutriPiki": tipografía fina en mayúsculas con tracking amplio
 * (estética de marca de lujo). "Piki" en acento champán con degradado sutil.
 */
export function Wordmark({ size = 'sm', style }: { size?: 'sm' | 'md' | 'lg'; style?: CSSProperties }) {
  const fs = size === 'lg' ? 30 : size === 'md' ? 18 : 12.5
  const ls = size === 'lg' ? '0.32em' : '0.26em'
  const gold: CSSProperties = {
    background: 'var(--brand-grad)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'var(--brand)',
  }
  return (
    <span
      style={{
        fontWeight: 600,
        fontSize: fs,
        letterSpacing: ls,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        ...style,
      }}
      aria-label="NutriPiki"
    >
      <span style={{ color: 'var(--text)' }}>Nutri</span>
      <span style={gold}>Piki</span>
    </span>
  )
}

/** Emblema circular con monograma para portadas (look premium). */
export function BrandEmblem({ size = 76 }: { size?: number }) {
  return (
    <div
      className="center-all"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06), transparent 60%), var(--card-2)',
        border: '1px solid color-mix(in srgb, var(--brand) 55%, transparent)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.02)',
      }}
      aria-hidden="true"
    >
      <span
        style={{
          fontSize: size * 0.34,
          fontWeight: 600,
          letterSpacing: '0.04em',
          background: 'var(--brand-grad)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'var(--brand)',
        }}
      >
        Np
      </span>
    </div>
  )
}
