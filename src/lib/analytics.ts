// ============================================================================
//  Analítica avanzada (100% local): tendencia de peso (EMA), previsión de meta
//  y mantenimiento adaptativo (TDEE dinámico estilo MacroFactor).
//  Todo se calcula en el dispositivo a partir de los datos ya guardados.
// ============================================================================
import type { WeightEntry } from '@/db/types'
import { KCAL_PER_KG } from './nutrition'
import { parseKey, dateKey, addDays } from './date'

export interface TrendPoint {
  date: string
  raw: number // peso registrado (kg)
  trend: number // media móvil exponencial (kg)
}

/**
 * Peso de tendencia: media móvil exponencial sobre los registros ordenados.
 * alpha bajo (≈0,1) = línea más suave (menos ruido por agua/sal).
 */
export function weightTrend(weights: WeightEntry[], alpha = 0.12): TrendPoint[] {
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1))
  let prev: number | null = null
  return sorted.map((w) => {
    const trend = prev == null ? w.weightKg : alpha * w.weightKg + (1 - alpha) * prev
    prev = trend
    return { date: w.date, raw: w.weightKg, trend: Math.round(trend * 100) / 100 }
  })
}

/** Último valor de tendencia (kg) o null si no hay datos. */
export function latestTrend(trend: TrendPoint[]): number | null {
  return trend.length ? trend[trend.length - 1].trend : null
}

/**
 * Ritmo de cambio de la tendencia en kg/semana, mirando los últimos `lookbackDays`.
 * Negativo = bajando de peso. null si no hay suficiente recorrido.
 */
export function trendRatePerWeek(trend: TrendPoint[], lookbackDays = 28): number | null {
  if (trend.length < 2) return null
  const last = trend[trend.length - 1]
  const cutoff = parseKey(last.date).getTime() - lookbackDays * 86400000
  const window = trend.filter((p) => parseKey(p.date).getTime() >= cutoff)
  const a = window[0] ?? trend[0]
  if (a.date === last.date) return null
  const days = (parseKey(last.date).getTime() - parseKey(a.date).getTime()) / 86400000
  if (days <= 0) return null
  return Math.round(((last.trend - a.trend) / days) * 7 * 100) / 100
}

export interface GoalEta {
  ratePerWeek: number
  reachable: boolean
  weeks: number | null
  date: string | null // yyyy-MM-dd
}

/**
 * Previsión de cuándo se alcanzará el peso objetivo según la tendencia actual.
 * Devuelve reachable=false si la tendencia va en sentido contrario o está plana.
 */
export function goalEta(
  currentTrendKg: number,
  goalKg: number,
  ratePerWeek: number,
  today: string,
): GoalEta {
  const remaining = currentTrendKg - goalKg // >0: hay que bajar; <0: hay que subir
  const base: GoalEta = { ratePerWeek, reachable: false, weeks: null, date: null }
  if (Math.abs(remaining) < 0.1) return { ...base, reachable: true, weeks: 0, date: today }
  // ¿La tendencia va hacia la meta?
  const goingDown = ratePerWeek < -0.02
  const goingUp = ratePerWeek > 0.02
  const towardGoal = (remaining > 0 && goingDown) || (remaining < 0 && goingUp)
  if (!towardGoal) return base
  const weeks = Math.abs(remaining) / Math.abs(ratePerWeek)
  if (!Number.isFinite(weeks) || weeks > 520) return { ...base, reachable: true, weeks: null, date: null }
  const eta = dateKey(addDays(parseKey(today), Math.round(weeks * 7)))
  return { ratePerWeek, reachable: true, weeks: Math.round(weeks * 10) / 10, date: eta }
}

export interface AdaptiveMaintenance {
  kcal: number
  loggedDays: number
  spanDays: number
}

/**
 * Mantenimiento (TDEE) real estimado a partir de la ingesta media y el cambio
 * de la tendencia de peso en una ventana reciente.
 *   mantenimiento = ingesta_media − (Δpeso_tendencia × 7700 / días)
 * Devuelve null si no hay datos suficientes para que sea fiable.
 */
export function adaptiveMaintenance(
  intakeByDate: { date: string; calories: number }[],
  weights: WeightEntry[],
  windowDays = 14,
): AdaptiveMaintenance | null {
  const logged = intakeByDate.filter((d) => d.calories > 0)
  if (logged.length < 7) return null
  // Ingesta media de los días registrados dentro de la ventana
  const sortedDates = [...logged].sort((a, b) => (a.date < b.date ? -1 : 1))
  const lastDate = sortedDates[sortedDates.length - 1].date
  const cutoff = parseKey(lastDate).getTime() - windowDays * 86400000
  const inWindow = sortedDates.filter((d) => parseKey(d.date).getTime() >= cutoff)
  if (inWindow.length < 7) return null
  const avgIntake = inWindow.reduce((s, d) => s + d.calories, 0) / inWindow.length

  // Cambio de la tendencia de peso en (aprox.) la misma ventana
  const trend = weightTrend(weights)
  const trendInWindow = trend.filter((p) => parseKey(p.date).getTime() >= cutoff)
  if (trendInWindow.length < 2) return null
  const first = trendInWindow[0]
  const last = trend[trend.length - 1]
  const spanDays = (parseKey(last.date).getTime() - parseKey(first.date).getTime()) / 86400000
  if (spanDays < 7) return null
  const deltaKg = last.trend - first.trend
  const maintenance = avgIntake - (deltaKg * KCAL_PER_KG) / spanDays
  if (!Number.isFinite(maintenance) || maintenance < 800 || maintenance > 6000) return null
  return {
    kcal: Math.round(maintenance / 10) * 10,
    loggedDays: inWindow.length,
    spanDays: Math.round(spanDays),
  }
}
