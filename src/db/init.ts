import { db } from './db'
import { SEED_FOODS, SEED_EXERCISES } from './seed'
import { tokenize } from '@/lib/search'
import type { AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  theme: 'dark',
  accent: '#0a84ff',
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
