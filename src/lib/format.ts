/** Redondea y formatea calorías sin decimales con separador de miles. */
export function fmtKcal(n: number): string {
  return Math.round(n).toLocaleString('es-ES')
}

/** Número con como mucho 1 decimal, sin ceros sobrantes. */
export function fmtNum(n: number, decimals = 1): string {
  const r = Math.round(n * 10 ** decimals) / 10 ** decimals
  return r.toLocaleString('es-ES', { maximumFractionDigits: decimals })
}

export function fmtG(n: number): string {
  return `${fmtNum(n)} g`
}

export function fmtSigned(n: number): string {
  const r = Math.round(n)
  return r > 0 ? `+${r}` : `${r}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function pct(value: number, goal: number): number {
  if (goal <= 0) return 0
  return clamp((value / goal) * 100, 0, 100)
}
