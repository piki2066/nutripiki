import Dexie, { type Table } from 'dexie'
import type {
  Food, FoodEntry, SavedMeal, Recipe, ExerciseDef, ExerciseEntry,
  WeightEntry, MeasurementEntry, ProgressPhoto, WaterEntry, StepsEntry,
  FastingSession, DiaryNote, UserProfile, AppSettings,
} from './types'

/**
 * Base de datos local (IndexedDB) de NutriPiki.
 * (El nombre del store sigue siendo 'nutripal' a propósito: cambiarlo borraría los datos.)
 * Todo vive en el dispositivo del usuario: 100% privado y offline.
 */
export class NutriPalDB extends Dexie {
  foods!: Table<Food, string>
  foodEntries!: Table<FoodEntry, string>
  savedMeals!: Table<SavedMeal, string>
  recipes!: Table<Recipe, string>
  exerciseDefs!: Table<ExerciseDef, string>
  exerciseEntries!: Table<ExerciseEntry, string>
  weights!: Table<WeightEntry, string>
  measurements!: Table<MeasurementEntry, string>
  photos!: Table<ProgressPhoto, string>
  water!: Table<WaterEntry, string>
  steps!: Table<StepsEntry, string>
  fasting!: Table<FastingSession, string>
  notes!: Table<DiaryNote, string>
  profile!: Table<UserProfile, string>
  settings!: Table<AppSettings, string>
  // Historial de búsquedas / frecuentes
  recentFoods!: Table<{ id: string; foodId: string; usedAt: number; count: number }, string>

  constructor() {
    super('nutripal')
    this.version(1).stores({
      foods: 'id, name, barcode, source, *tokens',
      foodEntries: 'id, date, meal, foodId, [date+meal], createdAt',
      savedMeals: 'id, name, createdAt',
      recipes: 'id, name, createdAt',
      exerciseDefs: 'id, name, kind',
      exerciseEntries: 'id, date, kind, createdAt',
      weights: 'id, date, createdAt',
      measurements: 'id, date, type, [type+date], createdAt',
      photos: 'id, date, createdAt',
      water: 'id, date, createdAt',
      steps: 'id, date',
      fasting: 'id, startTime, endTime',
      notes: 'id, date',
      profile: 'id',
      settings: 'id',
      recentFoods: 'id, foodId, usedAt, count',
    })
  }
}

export const db = new NutriPalDB()
