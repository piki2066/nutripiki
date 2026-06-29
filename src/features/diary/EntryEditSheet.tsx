import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { Stepper } from '@/components/ui'
import { NutritionLabel } from '@/features/foods/NutritionLabel'
import { DEFAULT_MEALS, MEAL_LABELS, type FoodEntry, type MealName } from '@/db/types'
import { updateEntryQuantity, deleteEntry, moveEntry } from '@/db/repo'
import { multiplyNutrients } from '@/lib/nutrition'
import { fmtKcal } from '@/lib/format'
import { useUI } from '@/lib/store'

export function EntryEditSheet({ entry, open, onClose }: { entry: FoodEntry | null; open: boolean; onClose: () => void }) {
  const toast = useUI((s) => s.toast)
  const [qty, setQty] = useState(1)
  const [meal, setMeal] = useState<MealName>('breakfast')

  useEffect(() => {
    if (entry) { setQty(entry.quantity); setMeal(entry.meal) }
  }, [entry?.id])

  if (!entry) return null
  const scale = entry.quantity ? qty / entry.quantity : 1
  const previewCals = entry.nutrients.calories * scale

  async function save() {
    if (entry!.servingGrams > 0 && qty !== entry!.quantity) await updateEntryQuantity(entry!.id, qty)
    if (meal !== entry!.meal) await moveEntry(entry!.id, meal)
    onClose()
  }
  async function remove() {
    await deleteEntry(entry!.id)
    toast('Eliminado')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar registro">
      <div className="col gap-3" style={{ paddingBottom: 10 }}>
        <div>
          <div className="h3">{entry.name}</div>
          <span className="cap dim">{entry.servingLabel} · {fmtKcal(previewCals)} kcal</span>
        </div>
        <div className="field">
          <span className="label">Comida</span>
          <div className="chip-row">
            {DEFAULT_MEALS.map((m) => (
              <button key={m} className={`chip ${meal === m ? 'chip--active' : ''}`} onClick={() => setMeal(m)}>{MEAL_LABELS[m]}</button>
            ))}
          </div>
        </div>
        {entry.servingGrams > 0 && (
          <div className="row between">
            <span className="label" style={{ margin: 0 }}>Cantidad ({entry.servingLabel})</span>
            <Stepper value={qty} onChange={setQty} step={0.5} min={0.25} max={99} decimals={2} />
          </div>
        )}
        <NutritionLabel nutrients={multiplyNutrients(entry.nutrients, scale)} />
        <div className="row gap-2">
          <button className="btn btn--danger grow" onClick={remove}><Icon name="trash" size={18} /> Eliminar</button>
          <button className="btn btn--grad grow" onClick={save}>Guardar</button>
        </div>
      </div>
    </Sheet>
  )
}
