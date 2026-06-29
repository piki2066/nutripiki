// ============================================================================
//  OpenFoodFacts — búsqueda de alimentos y lookup por código de barras.
//  Base de datos pública y gratuita (millones de productos con su código).
//  Sin clave de API. Las respuestas se cachean (service worker) para offline.
// ============================================================================
import type { Food, Nutrients, ServingOption } from '@/db/types'
import { EMPTY_NUTRIENTS } from '@/db/types'
import { uid } from './id'

const BASE = 'https://world.openfoodfacts.org'
const UA = 'NutriPiki/1.0 (PWA local de nutrición)'

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

/** Convierte los `nutriments` (por 100 g) de OFF a nuestro tipo Nutrients. */
function mapNutriments(nm: Record<string, unknown> = {}): Nutrients {
  const sodiumMg = nm['sodium_100g'] != null
    ? num(nm['sodium_100g']) * 1000
    : num(nm['salt_100g']) * 400 // sal(g) -> sodio(mg) aprox
  let kcal = num(nm['energy-kcal_100g'])
  if (!kcal && nm['energy_100g']) kcal = num(nm['energy_100g']) / 4.184 // kJ->kcal
  return {
    ...EMPTY_NUTRIENTS,
    calories: Math.round(kcal),
    carbs: num(nm['carbohydrates_100g']),
    fat: num(nm['fat_100g']),
    protein: num(nm['proteins_100g']),
    fiber: num(nm['fiber_100g']),
    sugar: num(nm['sugars_100g']),
    saturatedFat: num(nm['saturated-fat_100g']),
    transFat: num(nm['trans-fat_100g']),
    cholesterol: num(nm['cholesterol_100g']) * 1000,
    sodium: Math.round(sodiumMg),
    potassium: num(nm['potassium_100g']) * 1000,
    vitaminC: num(nm['vitamin-c_100g']) * 1000,
    calcium: num(nm['calcium_100g']) * 1000,
    iron: num(nm['iron_100g']) * 1000,
  }
}

interface OffProduct {
  code?: string
  product_name?: string
  product_name_es?: string
  generic_name_es?: string
  brands?: string
  quantity?: string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: Record<string, unknown>
  nutriscore_grade?: string
  nova_group?: number | string
  image_front_small_url?: string
}

function buildServings(p: OffProduct): ServingOption[] {
  const servings: ServingOption[] = []
  const sq = num(p.serving_quantity)
  if (sq > 0) {
    const label = p.serving_size ? `Ración (${p.serving_size})` : `Ración (${sq} g)`
    servings.push({ id: uid('sv'), label, grams: sq, isDefault: true })
  }
  servings.push({ id: uid('sv'), label: '100 g', grams: 100, isDefault: servings.length === 0 })
  return servings
}

/** Mapea un producto de OFF a nuestro Food (no se persiste hasta registrarlo). */
export function offToFood(p: OffProduct): Food | null {
  const name = p.product_name_es || p.product_name || p.generic_name_es
  if (!name) return null
  const per100 = mapNutriments(p.nutriments)
  if (per100.calories === 0 && per100.carbs === 0 && per100.fat === 0 && per100.protein === 0) {
    return null // sin datos nutricionales útiles
  }
  const grade = typeof p.nutriscore_grade === 'string' ? p.nutriscore_grade.toLowerCase() : undefined
  const nova = p.nova_group != null ? num(p.nova_group) : 0
  return {
    id: `off_${p.code ?? uid()}`,
    name: name.trim(),
    brand: p.brands?.split(',')[0]?.trim(),
    barcode: p.code,
    source: 'off',
    verified: false,
    nutriScore: grade && 'abcde'.includes(grade) ? grade : undefined,
    nova: nova >= 1 && nova <= 4 ? nova : undefined,
    per100,
    servings: buildServings(p),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/** Busca productos por texto en OpenFoodFacts. */
export async function searchOff(query: string, signal?: AbortSignal): Promise<Food[]> {
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=30&sort_by=popularity_key` +
    `&fields=code,product_name,product_name_es,generic_name_es,brands,quantity,serving_size,serving_quantity,nutriments,nutriscore_grade,nova_group,image_front_small_url`
  try {
    const res = await fetch(url, { signal, headers: { 'User-Agent': UA } })
    if (!res.ok) return []
    const data = (await res.json()) as { products?: OffProduct[] }
    return (data.products ?? [])
      .map(offToFood)
      .filter((f): f is Food => f !== null)
  } catch {
    return []
  }
}

/**
 * ¿Es un código interno de supermercado (peso variable / numeración de tienda)?
 * Los EAN-13 que empiezan por "2" están reservados a uso interno y NUNCA estarán
 * en bases de datos mundiales como OpenFoodFacts.
 */
export function isStoreInternalBarcode(code: string): boolean {
  return /^2\d{12}$/.test(code.trim())
}

/** Busca un producto por su código de barras (UPC/EAN). */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const url = `${BASE}/api/v2/product/${encodeURIComponent(code)}.json` +
    `?fields=code,product_name,product_name_es,generic_name_es,brands,quantity,serving_size,serving_quantity,nutriments,nutriscore_grade,nova_group,image_front_small_url`
  try {
    const res = await fetch(url, { signal, headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const data = (await res.json()) as { status?: number; product?: OffProduct }
    if (data.status !== 1 || !data.product) return null
    return offToFood({ ...data.product, code })
  } catch {
    return null
  }
}
