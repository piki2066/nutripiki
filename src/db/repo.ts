import { db } from './db'
import type {
  Food, FoodEntry, MealName, Nutrients, ServingOption, SavedMeal, Recipe,
  ExerciseEntry, WeightEntry, MeasurementEntry, UserProfile, AppSettings,
  MeasurementType, ProgressPhoto,
} from './types'
import { EMPTY_NUTRIENTS } from './types'
import { scaleNutrients, multiplyNutrients, sumNutrients } from '@/lib/nutrition'
import { tokenize } from '@/lib/search'
import { uid } from '@/lib/id'

// ---------- Perfil y ajustes ----------
export async function getProfile(): Promise<UserProfile | undefined> {
  return db.profile.get('me')
}
export async function saveProfile(p: UserProfile): Promise<void> {
  await db.profile.put({ ...p, id: 'me', updatedAt: Date.now() })
}
export async function patchProfile(patch: Partial<UserProfile>): Promise<void> {
  const cur = await getProfile()
  if (!cur) return
  await db.profile.put({ ...cur, ...patch, updatedAt: Date.now() })
}
export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const cur = (await db.settings.get('app')) as AppSettings
  await db.settings.put({ ...cur, ...patch, id: 'app' })
}

// ---------- Alimentos ----------
export async function upsertFood(food: Food): Promise<string> {
  const withTokens = { ...food, tokens: tokenize(`${food.name} ${food.brand ?? ''}`) }
  await db.foods.put(withTokens as unknown as Food)
  return food.id
}

export function defaultServing(food: Food): ServingOption {
  return food.servings.find((s) => s.isDefault) ?? food.servings[0]
}

/** Guarda/quita un alimento de "Guardados" (lo persiste si venía de OpenFoodFacts). */
export async function setFavorite(food: Food, favorite: boolean): Promise<void> {
  await upsertFood({ ...food, favorite })
}

/** Borra un alimento de la base local (no afecta a los registros ya guardados en el diario). */
export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id)
  await db.recentFoods.where('foodId').equals(id).delete()
}

/** Nutrición de una ración concreta * cantidad. */
export function nutrientsForServing(food: Food, serving: ServingOption, quantity: number): Nutrients {
  return scaleNutrients(food.per100, serving.grams * quantity)
}

/** Registra un alimento en el diario (crea snapshot + actualiza recientes). */
export async function logFood(args: {
  date: string
  meal: MealName
  food: Food
  servingId: string
  quantity: number
  planned?: boolean // true = se añade como planificado (no cuenta hasta marcarlo)
}): Promise<void> {
  const { date, meal, food, servingId, quantity, planned } = args
  await upsertFood(food)
  const serving = food.servings.find((s) => s.id === servingId) ?? defaultServing(food)

  // Si ya existe el mismo alimento con la misma ración en esta comida y día,
  // se fusiona sumando la cantidad (p. ej. "Huevo ×3") en vez de crear otra fila.
  const sameDayMeal = await db.foodEntries.where({ date, meal }).toArray()
  const match = sameDayMeal.find((e) =>
    e.foodId === food.id
    && !e.isQuickAdd
    && e.servingLabel === serving.label
    && e.servingGrams === serving.grams
    && (e.done === false) === (planned === true),
  )
  if (match) {
    const newQty = match.quantity + quantity
    await db.foodEntries.update(match.id, {
      quantity: newQty,
      nutrients: nutrientsForServing(food, serving, newQty),
    })
    await bumpRecent(food.id)
    return
  }

  const entry: FoodEntry = {
    id: uid('fe'),
    date,
    meal,
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    servingLabel: serving.label,
    servingGrams: serving.grams,
    quantity,
    nutrients: nutrientsForServing(food, serving, quantity),
    ...(planned ? { done: false } : {}),
    createdAt: Date.now(),
  }
  await db.foodEntries.add(entry)
  await bumpRecent(food.id)
}

/** Marca una entrada del diario como comida (done=true) o planificada (done=false). */
export async function setEntryDone(entryId: string, done: boolean): Promise<void> {
  await db.foodEntries.update(entryId, { done })
}

async function bumpRecent(foodId: string): Promise<void> {
  const existing = await db.recentFoods.where('foodId').equals(foodId).first()
  if (existing) {
    await db.recentFoods.update(existing.id, { usedAt: Date.now(), count: existing.count + 1 })
  } else {
    await db.recentFoods.add({ id: uid('rf'), foodId, usedAt: Date.now(), count: 1 })
  }
}

export async function logQuickAdd(args: {
  date: string
  meal: MealName
  nutrients: Partial<Nutrients>
  name?: string
}): Promise<void> {
  const nutrients: Nutrients = { ...EMPTY_NUTRIENTS, ...args.nutrients }
  const entry: FoodEntry = {
    id: uid('fe'),
    date: args.date,
    meal: args.meal,
    name: args.name || 'Registro rápido',
    servingLabel: '1 porción',
    servingGrams: 0,
    quantity: 1,
    nutrients,
    isQuickAdd: true,
    createdAt: Date.now(),
  }
  await db.foodEntries.add(entry)
}

export async function updateEntryQuantity(entryId: string, quantity: number): Promise<void> {
  const e = await db.foodEntries.get(entryId)
  if (!e || e.servingGrams === 0) return
  const per100factor = (e.servingGrams * quantity) / (e.servingGrams * e.quantity || 1)
  await db.foodEntries.update(entryId, {
    quantity,
    nutrients: multiplyNutrients(e.nutrients, per100factor),
  })
}

export async function deleteEntry(entryId: string): Promise<void> {
  await db.foodEntries.delete(entryId)
}

export async function moveEntry(entryId: string, meal: MealName): Promise<void> {
  await db.foodEntries.update(entryId, { meal })
}

// ---------- Quick tools: copiar / recordar ----------
export async function copyMealToDate(
  fromDate: string, meal: MealName, toDate: string, toMeal?: MealName,
): Promise<number> {
  const entries = await db.foodEntries.where({ date: fromDate, meal }).toArray()
  const clones = entries.map((e) => ({
    ...e,
    id: uid('fe'),
    date: toDate,
    meal: toMeal ?? meal,
    createdAt: Date.now(),
  }))
  if (clones.length) await db.foodEntries.bulkAdd(clones)
  return clones.length
}

export async function copyDay(fromDate: string, toDate: string): Promise<number> {
  const entries = await db.foodEntries.where('date').equals(fromDate).toArray()
  const clones = entries.map((e) => ({ ...e, id: uid('fe'), date: toDate, createdAt: Date.now() }))
  if (clones.length) await db.foodEntries.bulkAdd(clones)
  return clones.length
}

/** Copia el plan de un día (comidas + ejercicio) a otra fecha. */
export async function copyDayPlan(fromDate: string, toDate: string): Promise<number> {
  const foods = await db.foodEntries.where('date').equals(fromDate).toArray()
  const exs = await db.exerciseEntries.where('date').equals(fromDate).toArray()
  const fClones = foods.map((e) => ({ ...e, id: uid('fe'), date: toDate, createdAt: Date.now() }))
  const eClones = exs.map((e) => ({ ...e, id: uid('ee'), date: toDate, createdAt: Date.now() }))
  if (fClones.length) await db.foodEntries.bulkAdd(fClones)
  if (eClones.length) await db.exerciseEntries.bulkAdd(eClones)
  return fClones.length + eClones.length
}

/** Copia el plan de toda una semana (7 días alineados) a otra semana. */
export async function copyWeekPlan(fromWeek: string[], toWeek: string[]): Promise<number> {
  let n = 0
  for (let i = 0; i < Math.min(fromWeek.length, toWeek.length); i++) {
    n += await copyDayPlan(fromWeek[i], toWeek[i])
  }
  return n
}

/** Vacía el plan (comidas + ejercicio) de un día. */
export async function clearDayPlan(date: string): Promise<void> {
  await db.foodEntries.where('date').equals(date).delete()
  await db.exerciseEntries.where('date').equals(date).delete()
}

export async function rememberMeal(name: string, entries: FoodEntry[]): Promise<void> {
  const meal: SavedMeal = {
    id: uid('sm'),
    name,
    items: entries.map((e) => ({
      foodId: e.foodId,
      name: e.name,
      brand: e.brand,
      servingLabel: e.servingLabel,
      servingGrams: e.servingGrams,
      quantity: e.quantity,
      nutrients: e.nutrients,
    })),
    createdAt: Date.now(),
  }
  await db.savedMeals.add(meal)
}

export async function logSavedMeal(date: string, meal: MealName, saved: SavedMeal): Promise<void> {
  const clones: FoodEntry[] = saved.items.map((it) => ({
    id: uid('fe'),
    date,
    meal,
    foodId: it.foodId,
    name: it.name,
    brand: it.brand,
    servingLabel: it.servingLabel,
    servingGrams: it.servingGrams,
    quantity: it.quantity,
    nutrients: it.nutrients,
    createdAt: Date.now(),
  }))
  await db.foodEntries.bulkAdd(clones)
}

// ---------- Recetas ----------
export async function saveRecipe(recipe: Recipe): Promise<void> {
  await db.recipes.put(recipe)
}

/** Nutrición por ración de una receta. */
export function recipePerServing(recipe: Recipe): Nutrients {
  const total = sumNutrients(recipe.ingredients.map((i) => i.nutrients))
  return multiplyNutrients(total, 1 / Math.max(1, recipe.servings))
}

/** Convierte una receta en un Food (1 ración) para registrarla/buscarla. */
export function recipeToFood(recipe: Recipe): Food {
  const per = recipePerServing(recipe)
  return {
    id: `recipe_${recipe.id}`,
    name: recipe.name,
    source: 'recipe',
    verified: false,
    recipeId: recipe.id,
    per100: multiplyNutrients(per, 100 / 100), // tratamos "100 g" == 1 ración
    servings: [{ id: uid('sv'), label: '1 ración', grams: 100, isDefault: true }],
    createdAt: recipe.createdAt,
    updatedAt: Date.now(),
  }
}

// ---------- Agua ----------
export async function addWater(date: string, amountMl: number): Promise<void> {
  await db.water.add({ id: uid('w'), date, amountMl, createdAt: Date.now() })
}
export async function clearLastWater(date: string): Promise<void> {
  const last = await db.water.where('date').equals(date).reverse().sortBy('createdAt')
  if (last[0]) await db.water.delete(last[0].id)
}

// ---------- Ejercicio ----------
export async function logExercise(e: Omit<ExerciseEntry, 'id' | 'createdAt'>): Promise<void> {
  await db.exerciseEntries.add({ ...e, id: uid('ee'), createdAt: Date.now() })
}
export async function deleteExercise(id: string): Promise<void> {
  await db.exerciseEntries.delete(id)
}

// ---------- Pasos ----------
export async function setSteps(date: string, steps: number, caloriesBurned: number): Promise<void> {
  await db.steps.put({ id: date, date, steps, caloriesBurned, createdAt: Date.now() })
}

// ---------- Peso y medidas ----------
export async function addWeight(date: string, weightKg: number): Promise<void> {
  const existing = await db.weights.where('date').equals(date).first()
  if (existing) await db.weights.update(existing.id, { weightKg })
  else await db.weights.add({ id: uid('wt'), date, weightKg, createdAt: Date.now() })
}
export async function deleteWeight(id: string): Promise<void> {
  await db.weights.delete(id)
}
export async function addMeasurement(date: string, type: MeasurementType, value: number): Promise<void> {
  await db.measurements.add({ id: uid('ms'), date, type, value, createdAt: Date.now() })
}
export async function addPhoto(photo: Omit<ProgressPhoto, 'id' | 'createdAt'>): Promise<void> {
  await db.photos.add({ ...photo, id: uid('ph'), createdAt: Date.now() })
}
export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id)
}

// ---------- Notas del diario ----------
export async function saveNote(date: string, text: string): Promise<void> {
  if (!text.trim()) {
    await db.notes.delete(date)
  } else {
    await db.notes.put({ id: date, date, text, createdAt: Date.now() })
  }
}

// ---------- Reset ----------
export async function wipeAllData(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()))
}

// ---------- Recientes / frecuentes ----------
export async function getRecentFoods(limit = 30): Promise<Food[]> {
  const recents = await db.recentFoods.orderBy('usedAt').reverse().limit(limit).toArray()
  const foods = await Promise.all(recents.map((r) => db.foods.get(r.foodId)))
  return foods.filter((f): f is Food => !!f)
}
export async function getFrequentFoods(limit = 30): Promise<Food[]> {
  const recents = await db.recentFoods.orderBy('count').reverse().limit(limit).toArray()
  const foods = await Promise.all(recents.map((r) => db.foods.get(r.foodId)))
  return foods.filter((f): f is Food => !!f)
}
