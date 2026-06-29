import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { EmptyState } from '@/components/ui'
import { FoodRow } from './FoodRow'
import { FoodDetailSheet } from './FoodDetailSheet'
import { QuickAddSheet } from './QuickAddSheet'
import { BarcodeScanner } from './BarcodeScanner'
import { db } from '@/db/db'
import type { Food, MealName } from '@/db/types'
import { MEAL_LABELS } from '@/db/types'
import { logFood, defaultServing, getRecentFoods, getFrequentFoods, recipeToFood } from '@/db/repo'
import { searchOff, lookupBarcode } from '@/lib/off'
import { normalize, scoreMatch } from '@/lib/search'
import { useDebounce } from '@/hooks/useDebounce'
import { useRecipes, useSavedMeals, useCustomFoods } from '@/hooks/useData'
import { logSavedMeal } from '@/db/repo'
import { useUI } from '@/lib/store'
import { todayKey } from '@/lib/date'

type Tab = 'all' | 'recent' | 'frequent' | 'mine' | 'meals' | 'recipes'
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'recent', label: 'Recientes' },
  { id: 'frequent', label: 'Frecuentes' },
  { id: 'mine', label: 'Mis alimentos' },
  { id: 'meals', label: 'Comidas' },
  { id: 'recipes', label: 'Recetas' },
]

export default function AddFoodScreen() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const toast = useUI((s) => s.toast)
  const date = params.get('date') || todayKey()
  const meal = (params.get('meal') as MealName) || 'breakfast'

  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 400)
  const [localResults, setLocalResults] = useState<Food[]>([])
  const [offResults, setOffResults] = useState<Food[]>([])
  const [recent, setRecent] = useState<Food[]>([])
  const [frequent, setFrequent] = useState<Food[]>([])
  const [loadingOff, setLoadingOff] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(params.get('scan') === '1')

  const recipes = useRecipes()
  const savedMeals = useSavedMeals()
  const customFoods = useCustomFoods()

  useEffect(() => { getRecentFoods().then(setRecent); getFrequentFoods().then(setFrequent) }, [])

  // Búsqueda local (foods table)
  useEffect(() => {
    let active = true
    const q = normalize(debounced)
    if (!q) { setLocalResults([]); return }
    db.foods.toArray().then((all) => {
      if (!active) return
      const scored = all
        .map((f) => ({ f, s: scoreMatch(f.name, f.brand, debounced) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || (b.f.verified ? 1 : 0) - (a.f.verified ? 1 : 0))
        .slice(0, 40)
        .map((x) => x.f)
      setLocalResults(scored)
    })
    return () => { active = false }
  }, [debounced])

  // Búsqueda en OpenFoodFacts (solo pestaña "Todos")
  useEffect(() => {
    if (tab !== 'all' || debounced.trim().length < 2) { setOffResults([]); return }
    const ctrl = new AbortController()
    setLoadingOff(true)
    searchOff(debounced, ctrl.signal)
      .then((r) => setOffResults(r))
      .finally(() => setLoadingOff(false))
    return () => ctrl.abort()
  }, [debounced, tab])

  async function quickLog(food: Food) {
    await logFood({ date, meal, food, servingId: defaultServing(food).id, quantity: 1 })
    toast(`Añadido a ${MEAL_LABELS[meal]}`, { icon: 'check' })
    getRecentFoods().then(setRecent)
  }

  async function onBarcode(code: string) {
    setScanOpen(false)
    toast('Buscando producto…')
    // primero en local
    const local = await db.foods.where('barcode').equals(code).first()
    if (local) { setSelected(local); return }
    const found = await lookupBarcode(code)
    if (found) setSelected(found)
    else toast('Producto no encontrado en la base de datos', { icon: 'info' })
  }

  const list: Food[] = useMemo(() => {
    switch (tab) {
      case 'recent': return query ? recent.filter((f) => scoreMatch(f.name, f.brand, query) > 0) : recent
      case 'frequent': return frequent
      case 'mine': return customFoods
      case 'recipes': return recipes.map(recipeToFood)
      default: return []
    }
  }, [tab, recent, frequent, customFoods, recipes, query])

  return (
    <div className="screen screen--flush">
      <AppHeader back title={`Añadir a ${MEAL_LABELS[meal]}`}
        trailing={<button className="icon-btn icon-btn--fill" onClick={() => setScanOpen(true)} aria-label="Escanear"><Icon name="scan" size={22} /></button>} />

      <div style={{ padding: '0 16px' }}>
        {/* Buscador */}
        <div className="input-suffix" style={{ marginBottom: 10 }}>
          <input className="input" style={{ paddingLeft: 42 }} placeholder="Buscar alimento o marca…"
            value={query} autoFocus onChange={(e) => setQuery(e.target.value)} />
          <Icon name="search" size={20} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: 15 }} />
        </div>

        {/* Tabs */}
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {TABS.map((t) => (
            <button key={t.id} className={`chip ${tab === t.id ? 'chip--active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div className="row gap-2" style={{ marginBottom: 12 }}>
          <button className="btn btn--soft btn--sm grow" onClick={() => setQuickOpen(true)}><Icon name="bolt" size={16} /> Registro rápido</button>
          <button className="btn btn--soft btn--sm grow" onClick={() => nav('/food/new')}><Icon name="plus" size={16} /> Crear alimento</button>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Pestaña "Comidas" guardadas */}
        {tab === 'meals' && (
          savedMeals.length ? (
            <div className="list">
              {savedMeals.map((m) => (
                <div key={m.id} className="list-item list-item--tap" onClick={async () => {
                  await logSavedMeal(date, meal, m); toast(`"${m.name}" añadida`, { icon: 'check' })
                }}>
                  <Icon name="meal" size={22} color="var(--brand)" />
                  <div className="col" style={{ gap: 2, flex: 1 }}>
                    <span className="list-item__title">{m.name}</span>
                    <span className="list-item__sub">{m.items.length} alimentos · {Math.round(m.items.reduce((s, i) => s + i.nutrients.calories, 0))} kcal</span>
                  </div>
                  <Icon name="plus" size={22} color="var(--brand)" />
                </div>
              ))}
            </div>
          ) : <EmptyState icon="meal" title="Sin comidas guardadas" sub="Guarda combinaciones desde el diario con 'Recordar comida'." />
        )}

        {tab === 'recipes' && !recipes.length && (
          <EmptyState icon="recipe" title="Sin recetas" sub="Crea recetas o impórtalas desde una URL." />
        )}
        {tab === 'recipes' && recipes.length > 0 && (
          <div className="row gap-2" style={{ marginBottom: 12 }}>
            <button className="btn btn--soft btn--sm grow" onClick={() => nav('/recipe/new')}><Icon name="plus" size={16} /> Nueva receta</button>
            <button className="btn btn--soft btn--sm grow" onClick={() => nav('/recipe/import')}><Icon name="download" size={16} /> Importar URL</button>
          </div>
        )}

        {/* Listas estándar */}
        {tab !== 'meals' && (
          <>
            {tab === 'all' && localResults.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 4 }}>Base de datos local</div>
                <div className="list">
                  {localResults.map((f) => <FoodRow key={f.id} food={f} onOpen={() => setSelected(f)} onQuickAdd={() => quickLog(f)} />)}
                </div>
              </>
            )}
            {tab === 'all' && (offResults.length > 0 || loadingOff) && (
              <>
                <div className="section-title">OpenFoodFacts {loadingOff && '· buscando…'}</div>
                {loadingOff && offResults.length === 0 && (
                  <div className="col gap-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}</div>
                )}
                <div className="list">
                  {offResults.map((f) => <FoodRow key={f.id} food={f} onOpen={() => setSelected(f)} onQuickAdd={() => quickLog(f)} />)}
                </div>
              </>
            )}
            {tab !== 'all' && tab !== 'recipes' && (
              list.length ? (
                <div className="list">
                  {list.map((f) => <FoodRow key={f.id} food={f} onOpen={() => setSelected(f)} onQuickAdd={() => quickLog(f)} />)}
                </div>
              ) : <EmptyState icon="food" title="Nada por aquí todavía" sub={tab === 'mine' ? 'Crea tus propios alimentos.' : 'Registra alimentos y aparecerán aquí.'} />
            )}
            {tab === 'recipes' && list.length > 0 && (
              <div className="list">
                {list.map((f) => <FoodRow key={f.id} food={f} onOpen={() => setSelected(f)} onQuickAdd={() => quickLog(f)} />)}
              </div>
            )}
            {tab === 'all' && !query && (
              <EmptyState icon="search" title="Busca un alimento" sub="Escribe un nombre o marca, o escanea un código de barras." />
            )}
            {tab === 'all' && query.length >= 2 && !loadingOff && localResults.length === 0 && offResults.length === 0 && (
              <EmptyState icon="search" title="Sin resultados" sub="Prueba otro término o crea el alimento manualmente." />
            )}
          </>
        )}
      </div>

      <FoodDetailSheet food={selected} date={date} defaultMeal={meal} open={!!selected}
        onClose={() => setSelected(null)} onLogged={() => { getRecentFoods().then(setRecent) }} />
      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} date={date} defaultMeal={meal} />
      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onBarcode} />
    </div>
  )
}
