import { db } from './db'
import { SEED_FOODS, SEED_EXERCISES } from './seed'
import { tokenize, normalize } from '@/lib/search'
import type { AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  theme: 'dark',
  accent: '#c8a96a',
  remindersEnabled: false,
  reminderTimes: {},
  showMicros: true,
  netCarbsMode: false,
  diaryNutrientColumns: ['calories', 'carbs', 'fat', 'protein'],
}

/** Siembra la base de datos la primera vez (alimentos, ejercicios, ajustes). */
export async function seedIfEmpty(): Promise<void> {
  const foodCount = await db.foods.count()
  if (foodCount === 0) {
    const withTokens = SEED_FOODS.map((f) => ({
      ...f,
      tokens: tokenize(`${f.name} ${f.brand ?? ''}`),
    })) as unknown as typeof SEED_FOODS
    await db.foods.bulkAdd(withTokens)
  }
  const exCount = await db.exerciseDefs.count()
  if (exCount === 0) {
    await db.exerciseDefs.bulkAdd(SEED_EXERCISES)
  }
  const settings = await db.settings.get('app')
  if (!settings) {
    await db.settings.add(DEFAULT_SETTINGS)
  }
}

/**
 * Añade los alimentos base que falten a instalaciones ya existentes (con datos),
 * sin duplicar ni sobrescribir. Idempotente: ejecutar en cada arranque es seguro.
 * Dedup por id determinista Y por nombre normalizado (evita duplicar seeds antiguos
 * que tenían ids aleatorios).
 */
export async function topUpSeeds(): Promise<void> {
  try {
    const seeds = await db.foods.where('source').equals('seed').toArray()
    const haveIds = new Set(seeds.map((f) => f.id))
    const haveNames = new Set(seeds.map((f) => normalize(f.name)))
    const missing = SEED_FOODS.filter(
      (f) => !haveIds.has(f.id) && !haveNames.has(normalize(f.name)),
    )
    if (!missing.length) return
    const withTokens = missing.map((f) => ({
      ...f,
      tokens: tokenize(`${f.name} ${f.brand ?? ''}`),
    })) as unknown as typeof SEED_FOODS
    await db.foods.bulkPut(withTokens)
  } catch (e) {
    console.error('topUpSeeds', e)
  }
}

/**
 * Añade los ejercicios del catálogo que falten (p. ej. artes marciales nuevas)
 * a instalaciones ya existentes. Dedup por nombre normalizado. Idempotente.
 */
// Acentos del tema anterior (azul iOS y compañía): se migran al champán premium.
const OLD_ACCENTS = new Set(['#0a84ff', '#34c759', '#ff375f', '#ff9f0a', '#5e5ce6', '#ff2d55'])

/** Migra el acento del tema viejo al nuevo champán (rebrand NutriPiki). Una sola vez. */
export async function migrateTheme(): Promise<void> {
  try {
    const s = await db.settings.get('app')
    if (s && OLD_ACCENTS.has((s.accent || '').toLowerCase())) {
      await db.settings.update('app', { accent: '#c8a96a' })
    }
  } catch (e) {
    console.error('migrateTheme', e)
  }
}

export async function topUpExercises(): Promise<void> {
  try {
    const defs = await db.exerciseDefs.toArray()
    const haveNames = new Set(defs.map((d) => normalize(d.name)))
    const missing = SEED_EXERCISES.filter((e) => !haveNames.has(normalize(e.name)))
    if (missing.length) await db.exerciseDefs.bulkAdd(missing)
  } catch (e) {
    console.error('topUpExercises', e)
  }
}
