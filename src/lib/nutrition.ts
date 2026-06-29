// ============================================================================
//  Motor de nutrición y objetivos (estilo MyFitnessPal)
//  - BMR: Mifflin-St Jeor
//  - TDEE: BMR * multiplicador de actividad
//  - Objetivo de calorías: TDEE +/- déficit según ritmo (7700 kcal ≈ 1 kg)
//  - Macros: reparto por % o por gramos
// ============================================================================
import type {
  ActivityLevel, GoalType, MacroGoals, MicroGoals, Nutrients, Sex,
} from '@/db/types'
import { EMPTY_NUTRIENTS } from '@/db/types'

export const KCAL_PER_KG = 7700 // energía aproximada de 1 kg de grasa corporal
export const KCAL_PER_G = { carbs: 4, protein: 4, fat: 9, alcohol: 7 }

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // poco o ningún ejercicio
  light: 1.375, // ejercicio ligero 1-3 días/semana
  moderate: 1.55, // ejercicio moderado 3-5 días/semana
  active: 1.725, // ejercicio intenso 6-7 días/semana
  very_active: 1.9, // muy intenso / trabajo físico
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario (poco o nada de ejercicio)',
  light: 'Ligeramente activo (1-3 días/sem)',
  moderate: 'Moderadamente activo (3-5 días/sem)',
  active: 'Muy activo (6-7 días/sem)',
  very_active: 'Extremadamente activo (trabajo físico / 2x día)',
}

/** Edad en años a partir de fecha de nacimiento (yyyy-MM-dd). */
export function ageFromBirth(birthDate: string, now = new Date()): number {
  const b = new Date(birthDate + 'T00:00:00')
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return Math.max(0, age)
}

/** Tasa metabólica basal (Mifflin-St Jeor). */
export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

/** Gasto energético total diario. */
export function tdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

/**
 * Objetivo de calorías a partir del TDEE, tipo de objetivo y ritmo (kg/semana).
 * Se aplica un suelo de seguridad (mín. ≈ BMR, nunca por debajo de 1200/1500).
 */
export function calorieGoal(
  tdeeVal: number,
  goal: GoalType,
  paceKgPerWeek: number,
  sex: Sex,
): number {
  const dailyDelta = (paceKgPerWeek * KCAL_PER_KG) / 7
  let target = tdeeVal
  if (goal === 'lose') target = tdeeVal - dailyDelta
  else if (goal === 'gain') target = tdeeVal + dailyDelta
  const floor = sex === 'male' ? 1500 : 1200
  return Math.max(floor, Math.round(target / 10) * 10)
}

/** Reparto de macros (por defecto MFP: 50% C / 20% P / 30% G). */
export function defaultMacros(calorieGoal: number): MacroGoals {
  return macrosFromPercent(calorieGoal, 50, 20, 30)
}

export function macrosFromPercent(
  calories: number, carbsPct: number, proteinPct: number, fatPct: number,
): MacroGoals {
  return {
    mode: 'percent',
    carbsPct, proteinPct, fatPct,
    carbsG: Math.round((calories * carbsPct) / 100 / KCAL_PER_G.carbs),
    proteinG: Math.round((calories * proteinPct) / 100 / KCAL_PER_G.protein),
    fatG: Math.round((calories * fatPct) / 100 / KCAL_PER_G.fat),
  }
}

export function macrosFromGrams(
  carbsG: number, proteinG: number, fatG: number,
): MacroGoals {
  const cal = carbsG * KCAL_PER_G.carbs + proteinG * KCAL_PER_G.protein + fatG * KCAL_PER_G.fat
  const safe = cal || 1
  return {
    mode: 'grams',
    carbsG, proteinG, fatG,
    carbsPct: Math.round((carbsG * KCAL_PER_G.carbs * 100) / safe),
    proteinPct: Math.round((proteinG * KCAL_PER_G.protein * 100) / safe),
    fatPct: Math.round((fatG * KCAL_PER_G.fat * 100) / safe),
  }
}

/** Calorías implicadas por un reparto de macros en gramos. */
export function caloriesFromMacros(m: Pick<MacroGoals, 'carbsG' | 'proteinG' | 'fatG'>): number {
  return Math.round(
    m.carbsG * KCAL_PER_G.carbs + m.proteinG * KCAL_PER_G.protein + m.fatG * KCAL_PER_G.fat,
  )
}

/**
 * Objetivos de micronutrientes por defecto basados en valores diarios de
 * referencia (dieta de ~2000 kcal) escalados a las calorías objetivo.
 */
export function defaultMicros(calorieGoal: number): MicroGoals {
  const f = calorieGoal / 2000
  return {
    fiber: Math.round(28 * f),
    sugar: Math.round(50 * f), // límite recomendado
    saturatedFat: Math.round(20 * f),
    cholesterol: 300, // mg límite
    sodium: 2300, // mg límite
    potassium: 3500, // mg objetivo
    vitaminA: 100, vitaminC: 100, calcium: 100, iron: 100, // %VD
  }
}

/** Net carbs = carbohidratos - fibra (modo keto). */
export function netCarbs(n: Nutrients): number {
  return Math.max(0, n.carbs - n.fiber)
}

/** Escala una nutrición "por 100 g" a una cantidad concreta de gramos. */
export function scaleNutrients(per100: Nutrients, grams: number): Nutrients {
  const f = grams / 100
  const out = { ...EMPTY_NUTRIENTS }
  for (const k of Object.keys(out) as (keyof Nutrients)[]) {
    out[k] = round1((per100[k] ?? 0) * f)
  }
  return out
}

/** Suma dos sets de nutrientes. */
export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out = { ...EMPTY_NUTRIENTS }
  for (const k of Object.keys(out) as (keyof Nutrients)[]) {
    out[k] = round1((a[k] ?? 0) + (b[k] ?? 0))
  }
  return out
}

/** Suma una lista de nutrientes. */
export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce(addNutrients, { ...EMPTY_NUTRIENTS })
}

/** Multiplica un set de nutrientes por un factor. */
export function multiplyNutrients(n: Nutrients, factor: number): Nutrients {
  const out = { ...EMPTY_NUTRIENTS }
  for (const k of Object.keys(out) as (keyof Nutrients)[]) {
    out[k] = round1((n[k] ?? 0) * factor)
  }
  return out
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Calorías quemadas en cardio a partir del MET, peso y duración.
 * kcal = MET * 3.5 * pesoKg / 200 * minutos
 */
export function caloriesFromMet(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * 3.5 * weightKg / 200) * minutes)
}

/** Estimación de calorías quemadas por pasos (aprox. 0.04 kcal/paso ajustado por peso). */
export function caloriesFromSteps(steps: number, weightKg: number): number {
  // ~0.0005 kcal por paso por kg de peso corporal
  return Math.round(steps * weightKg * 0.0005)
}

/** % de macronutrientes a partir de la nutrición consumida. */
export function macroPercents(n: Nutrients): { carbs: number; protein: number; fat: number } {
  const c = n.carbs * KCAL_PER_G.carbs
  const p = n.protein * KCAL_PER_G.protein
  const f = n.fat * KCAL_PER_G.fat
  const total = c + p + f
  if (total <= 0) return { carbs: 0, protein: 0, fat: 0 }
  return {
    carbs: Math.round((c / total) * 100),
    protein: Math.round((p / total) * 100),
    fat: Math.round((f / total) * 100),
  }
}
