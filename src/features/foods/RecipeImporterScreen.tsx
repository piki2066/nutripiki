import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Stepper, EmptyState } from '@/components/ui'
import { saveRecipe, recipePerServing } from '@/db/repo'
import { EMPTY_NUTRIENTS, type Recipe, type Nutrients } from '@/db/types'
import { uid } from '@/lib/id'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'

// ============================================================================
//  Helpers de parseo de schema.org/Recipe (ld+json) — tipado con guards.
// ============================================================================

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

/** "240 kcal", "12 g", "1,5" o número -> número. */
function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const m = v.replace(',', '.').match(/[\d.]+/)
    if (m) {
      const n = parseFloat(m[0])
      return Number.isFinite(n) ? n : 0
    }
  }
  return 0
}

function hasRecipeType(node: Record<string, unknown>): boolean {
  const t = node['@type']
  if (typeof t === 'string') return t.toLowerCase() === 'recipe'
  if (Array.isArray(t)) return t.some((x) => typeof x === 'string' && x.toLowerCase() === 'recipe')
  return false
}

/** Busca recursivamente el primer objeto con @type "Recipe" (arrays / @graph). */
function findRecipe(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item)
      if (found) return found
    }
    return null
  }
  if (isObject(node)) {
    if (hasRecipeType(node)) return node
    if ('@graph' in node) {
      const found = findRecipe(node['@graph'])
      if (found) return found
    }
  }
  return null
}

function parseIngredients(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim())
  return []
}

/** recipeInstructions: string | string[] | HowToStep[] | HowToSection. */
function parseInstructions(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (Array.isArray(v)) {
    return v
      .map((step): string => {
        if (typeof step === 'string') return step
        if (isObject(step)) {
          // HowToSection con itemListElement anidado
          if ('itemListElement' in step) return parseInstructions(step['itemListElement'])
          return asString(step['text']) ?? asString(step['name']) ?? ''
        }
        return ''
      })
      .map((s) => s.trim())
      .filter(Boolean)
      .join('\n')
  }
  if (isObject(v)) return asString(v['text']) ?? ''
  return ''
}

/** recipeYield: "4", "4 raciones", 4 o array -> nº de raciones. */
function parseYield(v: unknown): number {
  const first = Array.isArray(v) ? v[0] : v
  const n = Math.round(parseNum(first))
  return n > 0 ? n : 0
}

interface Extracted {
  name: string
  servings: number
  ingredients: string[]
  directions: string
  totals: Pick<Nutrients, 'calories' | 'carbs' | 'protein' | 'fat'>
}

/** Extrae los datos de receta a partir del HTML de la página. */
function extractRecipe(html: string): Extracted | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
  for (const script of scripts) {
    let json: unknown
    try {
      json = JSON.parse(script.textContent ?? '')
    } catch {
      continue // ld+json malformado: probamos el siguiente
    }
    const recipe = findRecipe(json)
    if (!recipe) continue

    const nutrition = isObject(recipe['nutrition']) ? recipe['nutrition'] : null
    return {
      name: asString(recipe['name'])?.trim() ?? '',
      servings: parseYield(recipe['recipeYield']),
      ingredients: parseIngredients(recipe['recipeIngredient']).filter(Boolean),
      directions: parseInstructions(recipe['recipeInstructions']),
      totals: {
        calories: nutrition ? parseNum(nutrition['calories']) : 0,
        carbs: nutrition ? parseNum(nutrition['carbohydrateContent']) : 0,
        protein: nutrition ? parseNum(nutrition['proteinContent']) : 0,
        fat: nutrition ? parseNum(nutrition['fatContent']) : 0,
      },
    }
  }
  return null
}

// ============================================================================
//  Construcción del Recipe a partir del formulario.
// ============================================================================

function parseTotals(kcal: string, carbs: string, protein: string, fat: string): Nutrients | null {
  const c = parseFloat(kcal) || 0
  const cb = parseFloat(carbs) || 0
  const pr = parseFloat(protein) || 0
  const ft = parseFloat(fat) || 0
  if (c <= 0 && cb <= 0 && pr <= 0 && ft <= 0) return null
  return { ...EMPTY_NUTRIENTS, calories: c, carbs: cb, protein: pr, fat: ft }
}

function buildRecipe(input: {
  id: string
  name: string
  servings: number
  ingredients: string[]
  totals: Nutrients | null
  directions: string
  sourceUrl: string
}): Recipe {
  const now = Date.now()
  const items: Recipe['ingredients'] = input.ingredients.map((line) => ({
    name: line,
    servingLabel: '1 ración',
    servingGrams: 0,
    quantity: 1,
    nutrients: EMPTY_NUTRIENTS,
  }))
  if (input.totals) {
    // Item ficticio: recipePerServing sumará estos totales y los dividirá por raciones.
    items.push({
      name: 'Valores nutricionales',
      servingLabel: 'total',
      servingGrams: 0,
      quantity: 1,
      nutrients: input.totals,
    })
  }
  const directions = input.directions.trim()
  const sourceUrl = input.sourceUrl.trim()
  return {
    id: input.id,
    name: input.name.trim() || 'Receta importada',
    servings: Math.max(1, input.servings),
    ingredients: items,
    directions: directions || undefined,
    sourceUrl: sourceUrl || undefined,
    createdAt: now,
    updatedAt: now,
  }
}

// ============================================================================
//  Pantalla
// ============================================================================

export default function RecipeImporterScreen() {
  const nav = useNavigate()
  const toast = useUI((s) => s.toast)

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Formulario (canónico y editable)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(4)
  const [ingredientsText, setIngredientsText] = useState('')
  const [directions, setDirections] = useState('')
  const [kcal, setKcal] = useState('')
  const [carbs, setCarbs] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')

  const ingredientLines = useMemo(
    () => ingredientsText.split('\n').map((l) => l.trim()).filter(Boolean),
    [ingredientsText],
  )
  const totals = useMemo(() => parseTotals(kcal, carbs, protein, fat), [kcal, carbs, protein, fat])

  const previewRecipe = useMemo(
    () => buildRecipe({ id: 'preview', name, servings, ingredients: ingredientLines, totals, directions, sourceUrl: url }),
    [name, servings, ingredientLines, totals, directions, url],
  )
  const perServing = useMemo(() => recipePerServing(previewRecipe), [previewRecipe])

  const canSave = name.trim().length > 0 && ingredientLines.length > 0

  async function doImport() {
    const u = url.trim()
    if (!u || loading) return
    setLoading(true)
    setNotice(null)
    try {
      const res = await fetch(u)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const data = extractRecipe(html)
      if (!data) {
        setNotice('No encontramos datos de receta (schema.org) en esa página. Rellena los campos a mano abajo.')
      } else {
        if (data.name) setName(data.name)
        if (data.servings > 0) setServings(data.servings)
        if (data.ingredients.length) setIngredientsText(data.ingredients.join('\n'))
        if (data.directions) setDirections(data.directions)
        // Prefijo con punto decimal: parseFloat (en parseTotals) no entiende la coma.
        const dec = (n: number) => String(Math.round(n * 10) / 10)
        if (data.totals.calories > 0) setKcal(String(Math.round(data.totals.calories)))
        if (data.totals.carbs > 0) setCarbs(dec(data.totals.carbs))
        if (data.totals.protein > 0) setProtein(dec(data.totals.protein))
        if (data.totals.fat > 0) setFat(dec(data.totals.fat))
        toast('Receta importada', { icon: 'check' })
      }
    } catch {
      setNotice('No se pudo leer la URL (es habitual por CORS al ser una app local). Copia los ingredientes y datos a mano abajo.')
    } finally {
      setLoading(false)
      setShowForm(true)
    }
  }

  async function save() {
    if (!canSave) return
    const recipe = buildRecipe({
      id: uid('rcp'),
      name,
      servings,
      ingredients: ingredientLines,
      totals,
      directions,
      sourceUrl: url,
    })
    await saveRecipe(recipe)
    toast('Receta guardada', { icon: 'check' })
    nav('/add')
  }

  return (
    <div className="screen">
      <AppHeader back title="Importar receta" />

      <div className="col gap-4">
        {/* --- Importar desde URL --- */}
        <div className="card col gap-3">
          <div className="field">
            <span className="label">URL de la receta</span>
            <input
              className="input"
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button className="btn btn--grad btn--full" disabled={loading || !url.trim()} onClick={doImport}>
            <Icon name="download" size={18} /> {loading ? 'Importando…' : 'Importar'}
          </button>
          <p className="cap dim">
            Intentamos leer los metadatos (schema.org/Recipe) de la página. Si la web bloquea el acceso (CORS),
            podrás introducir los datos manualmente.
          </p>
          {!showForm && (
            <button className="btn btn--soft btn--sm" onClick={() => setShowForm(true)}>
              <Icon name="edit" size={16} /> Introducir a mano
            </button>
          )}
        </div>

        {/* --- Aviso CORS / sin datos --- */}
        {notice && (
          <div className="card row gap-2" style={{ alignItems: 'flex-start' }}>
            <Icon name="info" size={20} color="var(--warn)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span className="cap">{notice}</span>
          </div>
        )}

        {/* --- Estado inicial vacío --- */}
        {!showForm && !notice && (
          <EmptyState
            icon="recipe"
            title="Importa una receta"
            sub="Pega la URL de una receta para extraer ingredientes y nutrición, o introdúcelos a mano."
          />
        )}

        {/* --- Formulario editable + vista previa --- */}
        {showForm && (
          <>
            <div className="card col gap-3">
              <div className="field">
                <span className="label">Nombre de la receta</span>
                <input
                  className="input"
                  placeholder="p. ej. Lentejas estofadas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="row between">
                <span className="label" style={{ margin: 0 }}>Raciones</span>
                <Stepper value={servings} onChange={setServings} min={1} max={99} />
              </div>

              <div className="field">
                <span className="label">Ingredientes (uno por línea)</span>
                <textarea
                  className="textarea"
                  style={{ minHeight: 140 }}
                  placeholder={'200 g de lentejas\n1 cebolla\n2 zanahorias\n…'}
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                />
              </div>

              <div className="field">
                <span className="label">Preparación (opcional)</span>
                <textarea
                  className="textarea"
                  placeholder="Pasos de elaboración…"
                  value={directions}
                  onChange={(e) => setDirections(e.target.value)}
                />
              </div>
            </div>

            {/* Totales nutricionales */}
            <div className="card col gap-3">
              <span className="label" style={{ margin: 0 }}>Valores nutricionales totales (opcional)</span>
              <div className="field">
                <span className="label">Calorías totales</span>
                <div className="input-suffix">
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="0"
                    value={kcal}
                    onChange={(e) => setKcal(e.target.value)}
                  />
                  <span>kcal</span>
                </div>
              </div>
              <div className="row gap-2">
                <MacroInput label="Carbos" color="var(--carbs)" value={carbs} onChange={setCarbs} />
                <MacroInput label="Proteína" color="var(--protein)" value={protein} onChange={setProtein} />
                <MacroInput label="Grasa" color="var(--fat)" value={fat} onChange={setFat} />
              </div>
              <p className="cap dim">Totales de toda la receta. Se reparten entre las {servings} raciones.</p>
            </div>

            {/* Vista previa */}
            <div>
              <div className="section-title">Vista previa</div>
              <div className="card col gap-3">
                <div className="row between">
                  <div className="col" style={{ gap: 2, minWidth: 0 }}>
                    <span className="h3 ellipsis">{name.trim() || 'Receta importada'}</span>
                    <span className="cap dim">{Math.max(1, servings)} raciones · {ingredientLines.length} ingredientes</span>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end', gap: 0 }}>
                    <span className="big-num t-cal" style={{ fontSize: 22 }}>{fmtKcal(perServing.calories)}</span>
                    <span className="cap dim">kcal / ración</span>
                  </div>
                </div>

                {totals && (
                  <div className="row gap-3">
                    <span className="cap"><span className="t-carbs">C</span> {fmtNum(perServing.carbs)} g</span>
                    <span className="cap"><span className="t-protein">P</span> {fmtNum(perServing.protein)} g</span>
                    <span className="cap"><span className="t-fat">G</span> {fmtNum(perServing.fat)} g</span>
                    <span className="cap dim">por ración</span>
                  </div>
                )}

                {ingredientLines.length > 0 ? (
                  <ul className="col gap-1" style={{ margin: 0, paddingLeft: 18 }}>
                    {ingredientLines.map((line, i) => (
                      <li key={i} className="cap" style={{ color: 'var(--text)' }}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="cap dim">Añade al menos un ingrediente para guardar la receta.</span>
                )}
              </div>
            </div>

            <button className="btn btn--grad btn--full" disabled={!canSave} onClick={save}>
              <Icon name="check" size={18} /> Guardar receta
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function MacroInput({
  label, color, value, onChange,
}: {
  label: string
  color: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="field grow">
      <span className="label" style={{ color }}>{label}</span>
      <div className="input-suffix">
        <input
          className="input"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 26 }}
        />
        <span>g</span>
      </div>
    </div>
  )
}
