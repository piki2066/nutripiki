import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { Stepper, EmptyState } from '@/components/ui'
import { db } from '@/db/db'
import type { Food, Nutrients, Recipe } from '@/db/types'
import { defaultServing, nutrientsForServing, saveRecipe } from '@/db/repo'
import { sumNutrients, multiplyNutrients } from '@/lib/nutrition'
import { searchOff } from '@/lib/off'
import { scoreMatch, normalize } from '@/lib/search'
import { useDebounce } from '@/hooks/useDebounce'
import { uid } from '@/lib/id'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'

interface Ingredient {
  key: string
  name: string
  servingLabel: string
  servingGrams: number
  quantity: number
  nutrients: Nutrients
  foodId?: string
}

export default function CreateRecipeScreen() {
  const nav = useNavigate()
  const toast = useUI((s) => s.toast)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(4)
  const [items, setItems] = useState<Ingredient[]>([])
  const [pick, setPick] = useState(false)

  const total = sumNutrients(items.map((i) => i.nutrients))
  const perServing = multiplyNutrients(total, 1 / Math.max(1, servings))

  function addFood(food: Food) {
    const sv = defaultServing(food)
    setItems((p) => [...p, {
      key: uid('ing'), name: food.name, servingLabel: sv.label, servingGrams: sv.grams,
      quantity: 1, nutrients: nutrientsForServing(food, sv, 1), foodId: food.id,
    }])
    setPick(false)
  }

  function setQty(key: string, q: number) {
    setItems((p) => p.map((i) => i.key === key
      ? { ...i, quantity: q, nutrients: multiplyNutrients(i.nutrients, q / i.quantity) }
      : i))
  }

  async function save() {
    const recipe: Recipe = {
      id: uid('rcp'), name: name.trim() || 'Receta', servings,
      ingredients: items.map((i) => ({
        foodId: i.foodId, name: i.name, servingLabel: i.servingLabel,
        servingGrams: i.servingGrams, quantity: i.quantity, nutrients: i.nutrients,
      })),
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    await saveRecipe(recipe)
    toast('Receta guardada', { icon: 'check' })
    nav(-1)
  }

  return (
    <div className="screen">
      <AppHeader back title="Nueva receta"
        trailing={<button className="chip chip--active" onClick={save} style={{ opacity: name && items.length ? 1 : 0.4, pointerEvents: name && items.length ? 'auto' : 'none' }}>Guardar</button>} />

      <div className="col gap-3">
        <div className="field">
          <span className="label">Nombre de la receta</span>
          <input className="input" placeholder="p. ej. Lasaña de verduras" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="row between">
          <span className="label" style={{ margin: 0 }}>Número de raciones</span>
          <Stepper value={servings} onChange={setServings} min={1} max={50} />
        </div>

        <div className="card col gap-2" style={{ alignItems: 'center' }}>
          <span className="label">Por ración</span>
          <div className="big-num t-cal" style={{ fontSize: 32 }}>{fmtKcal(perServing.calories)} kcal</div>
          <div className="row gap-4">
            <span className="cap"><b className="t-carbs">{fmtNum(perServing.carbs)}g</b> carbos</span>
            <span className="cap"><b className="t-protein">{fmtNum(perServing.protein)}g</b> prot</span>
            <span className="cap"><b className="t-fat">{fmtNum(perServing.fat)}g</b> grasa</span>
          </div>
          <span className="cap dim">Total receta: {fmtKcal(total.calories)} kcal</span>
        </div>

        <div className="section-title" style={{ marginBottom: 0 }}>Ingredientes ({items.length})</div>
        {items.length === 0 && <EmptyState icon="recipe" title="Sin ingredientes" sub="Añade alimentos para calcular la nutrición." />}
        {items.length > 0 && (
          <div className="list">
            {items.map((i) => (
              <div key={i.key} className="list-item">
                <div className="col" style={{ gap: 1, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                  <span className="list-item__title ellipsis">{i.name}</span>
                  <span className="list-item__sub">{fmtKcal(i.nutrients.calories)} kcal · {i.servingLabel}</span>
                </div>
                <Stepper value={i.quantity} onChange={(q) => setQty(i.key, q)} step={0.5} min={0.25} decimals={2} />
                <button className="icon-btn" onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))} aria-label="Quitar">
                  <Icon name="trash" size={18} color="var(--bad)" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn--soft btn--full" onClick={() => setPick(true)}><Icon name="plus" size={18} /> Añadir ingrediente</button>
      </div>

      <IngredientPicker open={pick} onClose={() => setPick(false)} onPick={addFood} />
    </div>
  )
}

function IngredientPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: Food) => void }) {
  const [q, setQ] = useState('')
  const debounced = useDebounce(q, 400)
  const [local, setLocal] = useState<Food[]>([])
  const [off, setOff] = useState<Food[]>([])

  useEffect(() => {
    if (!normalize(debounced)) { setLocal([]); return }
    db.foods.toArray().then((all) => {
      setLocal(all.map((f) => ({ f, s: scoreMatch(f.name, f.brand, debounced) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 25).map((x) => x.f))
    })
  }, [debounced])
  useEffect(() => {
    if (debounced.trim().length < 2) { setOff([]); return }
    const c = new AbortController()
    searchOff(debounced, c.signal).then(setOff)
    return () => c.abort()
  }, [debounced])

  const all = [...local, ...off]
  return (
    <Sheet open={open} onClose={onClose} full title="Añadir ingrediente">
      <div className="input-suffix" style={{ marginBottom: 12 }}>
        <input className="input" style={{ paddingLeft: 42 }} placeholder="Buscar alimento…" value={q} autoFocus onChange={(e) => setQ(e.target.value)} />
        <Icon name="search" size={20} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: 15 }} />
      </div>
      <div className="list">
        {all.map((f) => {
          const sv = defaultServing(f)
          const n = nutrientsForServing(f, sv, 1)
          return (
            <button key={f.id} className="list-item list-item--tap" onClick={() => onPick(f)}>
              <div className="col" style={{ gap: 1, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                <span className="list-item__title ellipsis">{f.name}</span>
                <span className="list-item__sub">{fmtKcal(n.calories)} kcal · {sv.label}</span>
              </div>
              <Icon name="plus-circle" size={22} color="var(--brand)" />
            </button>
          )
        })}
        {!all.length && q && <div className="empty"><span className="cap dim">Sin resultados</span></div>}
      </div>
    </Sheet>
  )
}
