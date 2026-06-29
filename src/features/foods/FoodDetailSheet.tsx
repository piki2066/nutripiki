import { useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { Stepper } from '@/components/ui'
import { NutritionLabel } from './NutritionLabel'
import type { Food, MealName } from '@/db/types'
import { DEFAULT_MEALS, MEAL_LABELS } from '@/db/types'
import { nutrientsForServing, defaultServing, logFood } from '@/db/repo'
import { macroPercents } from '@/lib/nutrition'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'

interface Props {
  food: Food | null
  date: string
  defaultMeal: MealName
  open: boolean
  onClose: () => void
  onLogged?: () => void
}

export function FoodDetailSheet({ food, date, defaultMeal, open, onClose, onLogged }: Props) {
  const toast = useUI((s) => s.toast)
  const [servingId, setServingId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [meal, setMeal] = useState<MealName>(defaultMeal)

  // Reset al abrir un alimento nuevo
  const serving = useMemo(() => {
    if (!food) return null
    return food.servings.find((s) => s.id === servingId) ?? defaultServing(food)
  }, [food, servingId])

  // Sincroniza estado cuando cambia el alimento
  useMemo(() => {
    if (food && open) {
      setServingId(defaultServing(food).id)
      setQuantity(1)
      setMeal(defaultMeal)
    }
  }, [food?.id, open])

  if (!food || !serving) return null

  const nutrients = nutrientsForServing(food, serving, quantity)
  const mp = macroPercents(nutrients)

  async function log() {
    await logFood({ date, meal, food: food!, servingId: serving!.id, quantity })
    toast(`Añadido a ${MEAL_LABELS[meal]}`, { icon: 'check' })
    onLogged?.()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} full title="Detalle del alimento"
      trailing={<button className="icon-btn icon-btn--fill" onClick={log} aria-label="Guardar"><Icon name="check" size={22} color="var(--brand)" /></button>}>
      <div className="col gap-3" style={{ paddingBottom: 20 }}>
        <div>
          <div className="h2">{food.name}</div>
          <div className="row gap-2" style={{ marginTop: 4 }}>
            {food.brand && <span className="muted">{food.brand}</span>}
            {food.verified && <span className="badge badge--verified"><Icon name="check-circle" size={13} /> Verificado</span>}
            {food.source === 'off' && <span className="badge badge--soft">OpenFoodFacts</span>}
            {food.source === 'recipe' && <span className="badge badge--brand">Receta</span>}
          </div>
        </div>

        {/* Resumen calorías + macros */}
        <div className="card col gap-3" style={{ alignItems: 'center' }}>
          <div className="big-num t-cal" style={{ fontSize: 40 }}>{fmtKcal(nutrients.calories)}</div>
          <span className="label" style={{ margin: 0 }}>calorías</span>
          <div className="row between" style={{ width: '100%' }}>
            <MacroMini label="Carbos" g={nutrients.carbs} pct={mp.carbs} color="var(--carbs)" />
            <MacroMini label="Proteína" g={nutrients.protein} pct={mp.protein} color="var(--protein)" />
            <MacroMini label="Grasa" g={nutrients.fat} pct={mp.fat} color="var(--fat)" />
          </div>
        </div>

        {/* Comida */}
        <div className="field">
          <span className="label">Comida</span>
          <div className="chip-row">
            {DEFAULT_MEALS.map((m) => (
              <button key={m} className={`chip ${meal === m ? 'chip--active' : ''}`} onClick={() => setMeal(m)}>
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Ración */}
        <div className="row gap-3" style={{ alignItems: 'flex-end' }}>
          <div className="field grow">
            <span className="label">Ración</span>
            <select className="select" value={serving.id} onChange={(e) => setServingId(e.target.value)}>
              {food.servings.map((s) => (
                <option key={s.id} value={s.id}>{s.label}{s.grams ? ` · ${fmtNum(s.grams)} ${food.isLiquid ? 'ml' : 'g'}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="label">Cantidad</span>
            <Stepper value={quantity} onChange={setQuantity} step={0.5} min={0.25} max={99} decimals={2} />
          </div>
        </div>

        {/* Etiqueta nutricional completa */}
        <div className="section-title" style={{ marginBottom: 0 }}>Información nutricional</div>
        <NutritionLabel nutrients={nutrients} />

        <button className="btn btn--grad btn--full" onClick={log} style={{ marginTop: 8 }}>
          <Icon name="plus" size={20} /> Añadir al diario
        </button>
      </div>
    </Sheet>
  )
}

function MacroMini({ label, g, pct, color }: { label: string; g: number; pct: number; color: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 1 }}>
      <span className="big-num" style={{ fontSize: 18, color }}>{fmtNum(g)}g</span>
      <span className="label" style={{ margin: 0 }}>{label}</span>
      <span className="cap dim">{pct}%</span>
    </div>
  )
}
