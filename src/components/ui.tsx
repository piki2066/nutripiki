import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { clamp } from '@/lib/format'

export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value, onChange, step = 1, min = 0, max = 9999, decimals = 0,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  decimals?: number
}) {
  const fix = (n: number) => Number(clamp(n, min, max).toFixed(decimals))
  return (
    <div className="stepper">
      <button onClick={() => onChange(fix(value - step))} aria-label="Menos">
        <Icon name="minus" size={18} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(fix(parseFloat(e.target.value) || 0))}
      />
      <button onClick={() => onChange(fix(value + step))} aria-label="Más">
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

export function MacroBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = goal > 0 ? clamp((value / goal) * 100, 0, 100) : 0
  return (
    <div className="macro-bar">
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function EmptyState({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={30} />
      </div>
      <div className="h3" style={{ marginBottom: 4 }}>{title}</div>
      {sub && <div className="cap">{sub}</div>}
    </div>
  )
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 2 }}>
      <div className="big-num" style={{ fontSize: 22, color: accent }}>{value}</div>
      <div className="label" style={{ margin: 0 }}>{label}</div>
    </div>
  )
}

export function Pill({ children, color = 'var(--fill)', text = 'var(--text-2)' }: { children: ReactNode; color?: string; text?: string }) {
  return (
    <span className="badge" style={{ background: color, color: text }}>{children}</span>
  )
}

export function ListRow({
  icon, iconColor, title, sub, trailing, onClick, danger,
}: {
  icon?: IconName
  iconColor?: string
  title: ReactNode
  sub?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <button className="list-item list-item--tap" onClick={onClick} style={{ background: 'none' }}>
      {icon && (
        <span style={{ color: danger ? 'var(--bad)' : iconColor ?? 'var(--brand)', display: 'flex' }}>
          <Icon name={icon} size={22} />
        </span>
      )}
      <span className="col" style={{ gap: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <span className="list-item__title ellipsis" style={{ color: danger ? 'var(--bad)' : undefined }}>{title}</span>
        {sub && <span className="list-item__sub ellipsis">{sub}</span>}
      </span>
      <span className="list-item__trail">{trailing ?? (onClick && <Icon name="chevron-right" size={18} color="var(--text-3)" />)}</span>
    </button>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 50, height: 30, borderRadius: 999,
        background: on ? 'var(--good)' : 'var(--fill-2)',
        position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
      }}
      role="switch"
      aria-checked={on}
    >
      <span
        style={{
          position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24,
          borderRadius: 999, background: '#fff', transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}
