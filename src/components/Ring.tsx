import type { ReactNode } from 'react'

interface RingProps {
  value: number
  goal: number
  size?: number
  thickness?: number
  color?: string
  track?: string
  overColor?: string
  children?: ReactNode
  rounded?: boolean
}

/** Anillo de progreso circular (SVG). Soporta sobrepasar el objetivo (segmento de aviso). */
export function Ring({
  value, goal, size = 132, thickness = 12,
  color = 'var(--brand)', track = 'var(--fill)', overColor = 'var(--bad)',
  children, rounded = true,
}: RingProps) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const ratio = goal > 0 ? value / goal : 0
  const clamped = Math.min(1, Math.max(0, ratio))
  const over = Math.min(1, Math.max(0, ratio - 1))
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={over > 0 ? overColor : color}
          strokeWidth={thickness}
          strokeLinecap={rounded ? 'round' : 'butt'}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (over > 0 ? 1 : clamped))}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.3s ease' }}
        />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  )
}

interface MultiRingProps {
  segments: { value: number; goal: number; color: string }[]
  size?: number
  thickness?: number
  gap?: number
  children?: ReactNode
}

/** Tres anillos concéntricos (estilo Apple Watch) para macros. */
export function MultiRing({ segments, size = 132, thickness = 10, gap = 6, children }: MultiRingProps) {
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {segments.map((s, i) => {
          const r = (size - thickness) / 2 - i * (thickness + gap)
          if (r <= 0) return null
          const c = 2 * Math.PI * r
          const ratio = s.goal > 0 ? Math.min(1, s.value / s.goal) : 0
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={thickness} />
              <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={s.color} strokeWidth={thickness} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}
                style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
              />
            </g>
          )
        })}
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  )
}
