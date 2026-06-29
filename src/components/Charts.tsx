import { useMemo } from 'react'

export interface Point {
  label: string
  value: number | null
}

/** Gráfica de líneas con área y puntos. Maneja valores nulos (huecos). */
export function LineChart({
  data, color = 'var(--brand)', height = 200, goal, unit = '',
}: {
  data: Point[]
  color?: string
  height?: number
  goal?: number
  unit?: string
}) {
  const W = 320
  const H = height
  const padL = 34
  const padB = 22
  const padT = 12
  const padR = 8

  const { path, area, dots, min, max, scaleY, scaleX } = useMemo(() => {
    const vals = data.map((d) => d.value).filter((v): v is number => v != null)
    let mn = Math.min(...(goal != null ? [...vals, goal] : vals), Infinity)
    let mx = Math.max(...(goal != null ? [...vals, goal] : vals), -Infinity)
    if (!vals.length) { mn = 0; mx = 1 }
    if (mn === mx) { mn -= 1; mx += 1 }
    const range = mx - mn
    mn -= range * 0.1
    mx += range * 0.1
    const sx = (i: number) => padL + (i / Math.max(1, data.length - 1)) * (W - padL - padR)
    const sy = (v: number) => padT + (1 - (v - mn) / (mx - mn)) * (H - padT - padB)
    const pts = data.map((d, i) => (d.value == null ? null : { x: sx(i), y: sy(d.value) }))
    let p = ''
    let started = false
    pts.forEach((pt) => {
      if (!pt) { started = false; return }
      p += `${started ? 'L' : 'M'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `
      started = true
    })
    const valid = pts.filter((p): p is { x: number; y: number } => p != null)
    const a = valid.length
      ? `M${valid[0].x} ${H - padB} ` + valid.map((pt) => `L${pt.x} ${pt.y}`).join(' ') + ` L${valid[valid.length - 1].x} ${H - padB} Z`
      : ''
    return { path: p, area: a, dots: valid, min: mn, max: mx, scaleY: sy, scaleX: sx }
  }, [data, goal, H])

  const ticks = [max, (max + min) / 2, min]

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
      <g className="chart-grid">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={scaleY(t)} y2={scaleY(t)} />
            <text className="chart-axis" x={2} y={scaleY(t) + 3}>{Math.round(t)}</text>
          </g>
        ))}
      </g>
      {goal != null && <line className="chart-goal" x1={padL} x2={W - padR} y1={scaleY(goal)} y2={scaleY(goal)} />}
      {area && <path className="chart-area" d={area} fill={color} />}
      <path className="chart-line" d={path} stroke={color} />
      {dots.map((d, i) => (
        <circle key={i} className="chart-dot" cx={d.x} cy={d.y} r={3.5} fill={color} />
      ))}
      {data.map((d, i) => (
        (i === 0 || i === data.length - 1 || data.length <= 8) && (
          <text key={i} className="chart-axis" x={scaleX(i)} y={H - 6} textAnchor="middle">{d.label}</text>
        )
      ))}
      <title>{unit}</title>
    </svg>
  )
}

/** Gráfica de barras (consumo diario vs objetivo). */
export function BarChart({
  data, color = 'var(--brand)', height = 200, goal,
}: {
  data: Point[]
  color?: string
  height?: number
  goal?: number
}) {
  const W = 320
  const H = height
  const padB = 22
  const padT = 10
  const max = Math.max(...data.map((d) => d.value ?? 0), goal ?? 0, 1)
  const bw = (W / data.length) * 0.6
  const gap = (W / data.length) * 0.4
  const scaleY = (v: number) => (1 - v / max) * (H - padT - padB) + padT
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
      {goal != null && goal > 0 && <line className="chart-goal" x1={0} x2={W} y1={scaleY(goal)} y2={scaleY(goal)} />}
      {data.map((d, i) => {
        const v = d.value ?? 0
        const x = i * (bw + gap) + gap / 2
        const y = scaleY(v)
        const over = goal != null && v > goal
        return (
          <g key={i}>
            <rect
              className="chart-bar" x={x} y={y} width={bw} height={Math.max(0, H - padB - y)}
              rx={3} fill={over ? 'var(--warn)' : color}
            />
            <text className="chart-axis" x={x + bw / 2} y={H - 6} textAnchor="middle">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** Donut simple para distribución (p.ej. macros). */
export function Donut({
  segments, size = 120, thickness = 22,
}: {
  segments: { value: number; color: string; label?: string }[]
  size?: number
  thickness?: number
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {segments.map((s, i) => {
        const frac = s.value / total
        const dash = frac * c
        const el = (
          <circle
            key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}
