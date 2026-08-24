import type {
  ExerciseEntry, FoodEntry, MealName, Nutrients, UserProfile, WeightEntry,
} from '@/db/types'
import { sumNutrients } from './nutrition'
import { parseKey } from './date'

/** Una entrada cuenta como "comida" salvo que esté marcada como planificada (done===false). */
export function isEaten(e: FoodEntry): boolean {
  return e.done !== false
}

/** Suma de nutrientes COMIDOS del día (excluye los planificados sin marcar). */
export function dayTotals(entries: FoodEntry[]): Nutrients {
  return sumNutrients(entries.filter(isEaten).map((e) => e.nutrients))
}

/** Suma de nutrientes PLANIFICADOS del día (todas las entradas, comidas o no). */
export function dayPlannedTotals(entries: FoodEntry[]): Nutrients {
  return sumNutrients(entries.map((e) => e.nutrients))
}

/** Suma de nutrientes comidos de una comida concreta. */
export function mealTotals(entries: FoodEntry[], meal: MealName): Nutrients {
  return sumNutrients(entries.filter((e) => e.meal === meal && isEaten(e)).map((e) => e.nutrients))
}

/** Calorías quemadas por ejercicio + pasos en un día. */
export function exerciseCalories(entries: ExerciseEntry[], stepCalories = 0): number {
  return Math.round(entries.reduce((s, e) => s + e.caloriesBurned, 0) + stepCalories)
}

/** Objetivo de calorías efectivo del día (considera objetivos por día de la semana). */
export function effectiveCalorieGoal(profile: UserProfile, dateKey: string): number {
  const dow = parseKey(dateKey).getDay() // 0=domingo
  const byDay = profile.caloriesByDay?.[dow]
  return byDay && byDay > 0 ? byDay : profile.calorieGoal
}

export interface CalorieSummary {
  goal: number
  food: number
  exercise: number
  remaining: number
  net: number // comida - ejercicio
  overBy: number
}

/** Resumen de calorías del día (estilo "Calorie Countdown" de MFP). */
export function calorieSummary(
  profile: UserProfile,
  dateKey: string,
  foodTotals: Nutrients,
  exerciseKcal: number,
): CalorieSummary {
  const goal = effectiveCalorieGoal(profile, dateKey)
  const food = Math.round(foodTotals.calories)
  const exercise = profile.addExerciseCalories ? Math.round(exerciseKcal) : 0
  const remaining = goal - food + exercise
  return {
    goal,
    food,
    exercise,
    remaining,
    net: food - exercise,
    overBy: remaining < 0 ? -remaining : 0,
  }
}

/** Racha de días consecutivos con registro (terminando hoy o ayer). */
export function loggingStreak(loggedDates: Set<string>, todayKey: string): number {
  let streak = 0
  const d = parseKey(todayKey)
  // permite que la racha siga viva si aún no se ha registrado hoy pero sí ayer
  if (!loggedDates.has(todayKey)) d.setDate(d.getDate() - 1)
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (loggedDates.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else break
  }
  return streak
}

/** Proyección "Reflect on your day": peso estimado en 5 semanas si cada día fuera como hoy. */
export function fiveWeekProjection(
  currentWeightKg: number,
  dailyDeficitKcal: number,
): number {
  // déficit positivo => pierde peso. 7700 kcal ≈ 1 kg
  const kgChange = (dailyDeficitKcal * 7 * 5) / 7700
  return Math.round((currentWeightKg - kgChange) * 10) / 10
}

/** Último peso registrado (o peso inicial del perfil). */
export function latestWeight(weights: WeightEntry[], fallbackKg: number): number {
  if (!weights.length) return fallbackKg
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? 1 : -1))
  return sorted[0].weightKg
}

/* ------------------------- Calorías de la semana ------------------------- */

export interface WeekDayData {
  date: string
  items: FoodEntry[]
  /** kcal realmente comidas (excluye lo planificado sin marcar). */
  eatenKcal: number
  /** kcal de TODO lo apuntado ese día (comido + planificado). */
  plannedKcal: number
  exerciseKcal: number
  hasExercise: boolean
}

/** Presupuesto de calorías de un día: objetivo del día + ejercicio (si el perfil lo suma). */
export function dayCalorieBudget(profile: UserProfile, date: string, exerciseKcal: number): number {
  return effectiveCalorieGoal(profile, date) + (profile.addExerciseCalories ? Math.round(exerciseKcal) : 0)
}

export interface WeekCalories {
  /** Total comido en los 7 días. */
  eaten: number
  /** Total apuntado (comido + planificado) en los 7 días. */
  planned: number
  /** Suma de los objetivos diarios (con ejercicio incluido si procede). */
  budget: number
  eatenSoFar: number
  budgetSoFar: number
  elapsedDays: number
  remainingDays: number
  /** Presupuesto − comido hasta hoy. Positivo = vas por debajo del objetivo. */
  balance: number
  /** Lo que queda de presupuesto semanal (puede ser negativo). */
  left: number
  /** kcal/día disponibles para los días que quedan. */
  perRemainingDay: number
  /** Media diaria comida de los días transcurridos. */
  avgPerDay: number
  /** Equivalencia en peso del balance semanal (7700 kcal ≈ 1 kg). */
  balanceKg: number
  /** La semana contiene el día de hoy. */
  isCurrent: boolean
  /** La semana entera ya pasó. */
  isPast: boolean
}

/** Suma las calorías de una semana completa y las compara con el objetivo. */
export function weekCalories(profile: UserProfile, days: WeekDayData[], today: string): WeekCalories {
  const eaten = days.reduce((s, d) => s + d.eatenKcal, 0)
  const planned = days.reduce((s, d) => s + d.plannedKcal, 0)
  const budget = days.reduce((s, d) => s + dayCalorieBudget(profile, d.date, d.exerciseKcal), 0)

  const past = days.filter((d) => d.date <= today)
  const eatenSoFar = past.reduce((s, d) => s + d.eatenKcal, 0)
  const budgetSoFar = past.reduce((s, d) => s + dayCalorieBudget(profile, d.date, d.exerciseKcal), 0)
  const elapsedDays = past.length
  const remainingDays = days.length - elapsedDays
  const left = budget - eaten
  const balance = budgetSoFar - eatenSoFar

  return {
    eaten,
    planned,
    budget,
    eatenSoFar,
    budgetSoFar,
    elapsedDays,
    remainingDays,
    balance,
    left,
    perRemainingDay: remainingDays > 0 ? Math.round(left / remainingDays) : 0,
    avgPerDay: elapsedDays > 0 ? Math.round(eatenSoFar / elapsedDays) : 0,
    balanceKg: balance / 7700,
    isCurrent: days.some((d) => d.date === today),
    isPast: elapsedDays === days.length,
  }
}
