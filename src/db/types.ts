// ============================================================================
//  NutriPal — Tipos del dominio
//  Modelo de datos completo inspirado en MyFitnessPal (todas las funciones).
// ============================================================================

/** Conjunto completo de nutrientes que se rastrean por alimento/entrada. */
export interface Nutrients {
  calories: number // kcal
  carbs: number // g
  fat: number // g
  protein: number // g
  // Detalle de carbohidratos
  fiber: number // g
  sugar: number // g
  addedSugar?: number // g
  // Detalle de grasas
  saturatedFat: number // g
  polyunsaturatedFat: number // g
  monounsaturatedFat: number // g
  transFat: number // g
  // Minerales / otros
  cholesterol: number // mg
  sodium: number // mg
  potassium: number // mg
  // Vitaminas / minerales (% VD o mg según campo)
  vitaminA: number // % Valor Diario
  vitaminC: number // % Valor Diario
  calcium: number // % Valor Diario
  iron: number // % Valor Diario
}

/** Lista canónica de claves de nutrientes (para iterar en UI). */
export const NUTRIENT_KEYS: (keyof Nutrients)[] = [
  'calories', 'carbs', 'fat', 'protein',
  'fiber', 'sugar', 'addedSugar',
  'saturatedFat', 'polyunsaturatedFat', 'monounsaturatedFat', 'transFat',
  'cholesterol', 'sodium', 'potassium',
  'vitaminA', 'vitaminC', 'calcium', 'iron',
]

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0, carbs: 0, fat: 0, protein: 0,
  fiber: 0, sugar: 0, addedSugar: 0,
  saturatedFat: 0, polyunsaturatedFat: 0, monounsaturatedFat: 0, transFat: 0,
  cholesterol: 0, sodium: 0, potassium: 0,
  vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0,
}

/** Una opción de ración: "1 taza (240 g)", "100 g", "1 unidad (52 g)"... */
export interface ServingOption {
  id: string
  label: string // p.ej. "Taza", "Rebanada", "100 g"
  grams: number // peso de UNA unidad de esta ración en gramos (para escalar)
  isDefault?: boolean
}

export type FoodSource = 'seed' | 'custom' | 'off' | 'recipe' | 'quick'

/**
 * Alimento de la base de datos. La nutrición se almacena SIEMPRE por 100 g
 * (o por 100 ml). Las raciones definen cuántos gramos pesa cada porción, de
 * modo que cualquier ración se calcula escalando desde "por 100 g".
 */
export interface Food {
  id: string
  name: string
  brand?: string
  barcode?: string
  source: FoodSource
  verified?: boolean
  nutriScore?: string // calidad nutricional OpenFoodFacts: 'a'..'e'
  nova?: number // grado de procesamiento NOVA: 1..4 (4 = ultraprocesado)
  // Nutrición por 100 g/ml
  per100: Nutrients
  servings: ServingOption[]
  isLiquid?: boolean // ml en lugar de g
  recipeId?: string // si proviene de una receta
  createdAt: number
  updatedAt: number
}

export type MealName = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export const DEFAULT_MEALS: MealName[] = ['breakfast', 'lunch', 'dinner', 'snacks']

export const MEAL_LABELS: Record<MealName, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snacks: 'Snacks',
}

/**
 * Entrada del diario de comidas. Guarda un *snapshot* de la nutrición para
 * que los registros históricos no cambien si el alimento se edita después.
 */
export interface FoodEntry {
  id: string
  date: string // yyyy-MM-dd
  meal: MealName
  foodId?: string
  // Snapshot mostrado en el diario
  name: string
  brand?: string
  servingLabel: string
  servingGrams: number
  quantity: number // nº de raciones
  nutrients: Nutrients // ya escalado a (servingGrams * quantity)
  isQuickAdd?: boolean
  done?: boolean // false = planificado (no cuenta hasta marcarlo comido); undefined/true = comido
  createdAt: number
}

/** Comida guardada del usuario ("Mis comidas"): conjunto de alimentos. */
export interface SavedMeal {
  id: string
  name: string
  items: Array<{
    foodId?: string
    name: string
    brand?: string
    servingLabel: string
    servingGrams: number
    quantity: number
    nutrients: Nutrients
  }>
  createdAt: number
}

/** Receta: ingredientes -> nutrición total y por porción. */
export interface Recipe {
  id: string
  name: string
  servings: number // nº de porciones que rinde
  ingredients: Array<{
    foodId?: string
    name: string
    servingLabel: string
    servingGrams: number
    quantity: number
    nutrients: Nutrients
  }>
  directions?: string
  sourceUrl?: string
  imageUrl?: string
  createdAt: number
  updatedAt: number
}

export type ExerciseKind = 'cardio' | 'strength'

/** Ejercicio del catálogo (con valor MET para estimar calorías). */
export interface ExerciseDef {
  id: string
  name: string
  kind: ExerciseKind
  met: number // equivalente metabólico
  custom?: boolean
}

/** Registro de ejercicio en el diario. */
export interface ExerciseEntry {
  id: string
  date: string
  kind: ExerciseKind
  name: string
  exerciseId?: string
  // cardio
  durationMin?: number
  caloriesBurned: number
  // fuerza
  sets?: number
  reps?: number
  weightKg?: number
  createdAt: number
}

export interface WeightEntry {
  id: string
  date: string
  weightKg: number
  createdAt: number
}

export type MeasurementType =
  | 'bodyfat' | 'waist' | 'hips' | 'neck' | 'chest'
  | 'arm' | 'forearm' | 'thigh' | 'calf' | 'shoulders'

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  bodyfat: '% Grasa corporal',
  waist: 'Cintura',
  hips: 'Cadera',
  neck: 'Cuello',
  chest: 'Pecho',
  arm: 'Brazo',
  forearm: 'Antebrazo',
  thigh: 'Muslo',
  calf: 'Pantorrilla',
  shoulders: 'Hombros',
}

export interface MeasurementEntry {
  id: string
  date: string
  type: MeasurementType
  value: number // cm o % según tipo
  createdAt: number
}

export interface ProgressPhoto {
  id: string
  date: string
  blob: Blob
  note?: string
  weightKg?: number
  createdAt: number
}

export interface WaterEntry {
  id: string
  date: string
  amountMl: number
  createdAt: number
}

export interface StepsEntry {
  id: string // = date (uno por día)
  date: string
  steps: number
  caloriesBurned: number
  createdAt: number
}

export interface FastingSession {
  id: string
  startTime: number // epoch ms
  endTime?: number // epoch ms (undefined = en curso)
  targetHours: number
  planName: string
  createdAt: number
}

export interface DiaryNote {
  id: string // = date
  date: string
  text: string
  createdAt: number
}

export type Sex = 'male' | 'female'
export type GoalType = 'lose' | 'maintain' | 'gain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Units = 'metric' | 'imperial'
export type MacroMode = 'percent' | 'grams'

export interface PerMealMacroGoal {
  caloriesPct: number // % del total de calorías para esta comida
}

/** Objetivos de macros: por % o por gramos. */
export interface MacroGoals {
  mode: MacroMode
  carbsPct: number
  proteinPct: number
  fatPct: number
  carbsG: number
  proteinG: number
  fatG: number
  netCarbs?: boolean // modo keto: net carbs (carbs - fiber)
}

/** Objetivos de micronutrientes (valores diarios objetivo). */
export interface MicroGoals {
  fiber: number // g
  sugar: number // g
  saturatedFat: number // g
  cholesterol: number // mg
  sodium: number // mg
  potassium: number // mg
  vitaminA: number // %VD
  vitaminC: number // %VD
  calcium: number // %VD
  iron: number // %VD
}

/** Perfil + objetivos del usuario (singleton, id = 'me'). */
export interface UserProfile {
  id: 'me'
  name: string
  sex: Sex
  birthDate: string // yyyy-MM-dd
  heightCm: number
  activityLevel: ActivityLevel
  units: Units
  // Objetivos de peso
  weightStartKg: number
  weightGoalKg: number
  goalType: GoalType
  paceKgPerWeek: number // 0.25, 0.5, 0.75, 1.0
  // Calorías
  calorieGoal: number // objetivo diario (kcal)
  tdee: number // mantenimiento estimado
  bmr: number
  manualCalories?: boolean // el usuario fijó las calorías a mano
  macros: MacroGoals
  micros: MicroGoals
  perMeal?: Record<MealName, PerMealMacroGoal> // objetivos por comida (Premium)
  caloriesByDay?: Record<number, number> // 0..6 -> kcal (objetivos por día, Premium)
  // Comportamiento
  addExerciseCalories: boolean // sumar calorías de ejercicio al presupuesto
  waterGoalMl: number
  stepGoal: number
  weeklyStartsMonday: boolean
  onboarded: boolean
  createdAt: number
  updatedAt: number
}

/** Ajustes de la app (singleton id='app'). */
export interface AppSettings {
  id: 'app'
  theme: 'dark' | 'light' | 'system'
  accent: string
  remindersEnabled: boolean
  reminderTimes: { breakfast?: string; lunch?: string; dinner?: string; weighIn?: string }
  showMicros: boolean
  netCarbsMode: boolean
  diaryNutrientColumns: (keyof Nutrients)[] // columnas visibles en el diario
}
