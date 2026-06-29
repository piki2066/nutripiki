import type { Nutrients } from '@/db/types'

export interface NutrientMeta {
  key: keyof Nutrients
  label: string
  unit: string
  group: 'macro' | 'carb' | 'fat' | 'mineral' | 'vitamin'
  indent?: boolean
  color?: string
}

export const NUTRIENT_META: NutrientMeta[] = [
  { key: 'calories', label: 'Calorías', unit: 'kcal', group: 'macro', color: 'var(--cal)' },
  { key: 'carbs', label: 'Carbohidratos', unit: 'g', group: 'macro', color: 'var(--carbs)' },
  { key: 'fiber', label: 'Fibra', unit: 'g', group: 'carb', indent: true },
  { key: 'sugar', label: 'Azúcares', unit: 'g', group: 'carb', indent: true },
  { key: 'addedSugar', label: 'Azúcares añadidos', unit: 'g', group: 'carb', indent: true },
  { key: 'fat', label: 'Grasas', unit: 'g', group: 'macro', color: 'var(--fat)' },
  { key: 'saturatedFat', label: 'Grasa saturada', unit: 'g', group: 'fat', indent: true },
  { key: 'monounsaturatedFat', label: 'Grasa monoinsaturada', unit: 'g', group: 'fat', indent: true },
  { key: 'polyunsaturatedFat', label: 'Grasa poliinsaturada', unit: 'g', group: 'fat', indent: true },
  { key: 'transFat', label: 'Grasa trans', unit: 'g', group: 'fat', indent: true },
  { key: 'protein', label: 'Proteínas', unit: 'g', group: 'macro', color: 'var(--protein)' },
  { key: 'cholesterol', label: 'Colesterol', unit: 'mg', group: 'mineral' },
  { key: 'sodium', label: 'Sodio', unit: 'mg', group: 'mineral' },
  { key: 'potassium', label: 'Potasio', unit: 'mg', group: 'mineral' },
  { key: 'vitaminA', label: 'Vitamina A', unit: '%', group: 'vitamin' },
  { key: 'vitaminC', label: 'Vitamina C', unit: '%', group: 'vitamin' },
  { key: 'calcium', label: 'Calcio', unit: '%', group: 'vitamin' },
  { key: 'iron', label: 'Hierro', unit: '%', group: 'vitamin' },
]

export const METR = Object.fromEntries(NUTRIENT_META.map((m) => [m.key, m])) as Record<keyof Nutrients, NutrientMeta>

/** Nutrientes disponibles para el "Nutrient Dashboard" (tarjetas seleccionables). */
export const DASHBOARD_NUTRIENTS: (keyof Nutrients)[] = [
  'carbs', 'fat', 'protein', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat',
  'transFat', 'cholesterol', 'sodium', 'potassium', 'fiber', 'sugar',
  'vitaminA', 'vitaminC', 'calcium', 'iron',
]
