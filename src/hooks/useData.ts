import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { AppSettings, UserProfile } from '@/db/types'
import { DEFAULT_SETTINGS } from '@/db/init'

export function useProfile(): UserProfile | undefined | null {
  // undefined = cargando, null = no existe (sin onboarding)
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, [])
}

export function useSettings(): AppSettings {
  return useLiveQuery(async () => (await db.settings.get('app')) ?? DEFAULT_SETTINGS, [], DEFAULT_SETTINGS)!
}

export function useDayEntries(date: string) {
  return useLiveQuery(() => db.foodEntries.where('date').equals(date).toArray(), [date], [])
}

export function useDayExercise(date: string) {
  return useLiveQuery(() => db.exerciseEntries.where('date').equals(date).toArray(), [date], [])
}

export function useDayWater(date: string) {
  return useLiveQuery(() => db.water.where('date').equals(date).toArray(), [date], [])
}

export function useDaySteps(date: string) {
  return useLiveQuery(() => db.steps.get(date), [date])
}

export function useDayNote(date: string) {
  return useLiveQuery(() => db.notes.get(date), [date])
}

export function useWeights() {
  return useLiveQuery(() => db.weights.orderBy('date').toArray(), [], [])
}

export function useMeasurements() {
  return useLiveQuery(() => db.measurements.orderBy('date').toArray(), [], [])
}

export function usePhotos() {
  return useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), [], [])
}

export function useRecipes() {
  return useLiveQuery(() => db.recipes.orderBy('createdAt').reverse().toArray(), [], [])
}

export function useSavedMeals() {
  return useLiveQuery(() => db.savedMeals.orderBy('createdAt').reverse().toArray(), [], [])
}

export function useCustomFoods() {
  return useLiveQuery(() => db.foods.where('source').equals('custom').reverse().toArray(), [], [])
}

export function useExerciseDefs() {
  return useLiveQuery(() => db.exerciseDefs.orderBy('name').toArray(), [], [])
}

export function useActiveFast() {
  return useLiveQuery(async () => {
    const open = await db.fasting.filter((f) => !f.endTime).toArray()
    return open.sort((a, b) => b.startTime - a.startTime)[0] ?? null
  }, [])
}

export function useAllLoggedDates() {
  return useLiveQuery(async () => {
    const entries = await db.foodEntries.orderBy('date').keys()
    return new Set(entries as string[])
  }, [], new Set<string>())
}
