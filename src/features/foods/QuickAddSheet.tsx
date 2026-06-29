import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { DEFAULT_MEALS, MEAL_LABELS, type MealName } from '@/db/types'
import { logQuickAdd } from '@/db/repo'
import { KCAL_PER_G } from '@/lib/nutrition'
import { useUI } from '@/lib/store'

interface Props {
  open: boolean
  onClose: () => void
  date: string
  defaultMeal: MealName
}

export function QuickAddSheet({ open, onClose, date, defaultMeal }: Props) {
  const toast = useUI((s) => s.toast)
  const [meal, setMeal] = useState<MealName>(defaultMeal)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [carbs, setCarbs] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')

  const macroCals =
    (parseFloat(carbs) || 0) * KCAL_PER_G.carbs +
    (parseFloat(protein) || 0) * KCAL_PER_G.protein +
    (parseFloat(fat) || 0) * KCAL_PER_G.fat

  async function save() {
    const cal = parseFloat(calories) || Math.round(macroCals)
    if (cal <= 0 && macroCals <= 0) return
    await logQuickAdd({
      date, meal, name: name || 'Registro rápido',
      nutrients: {
        calories: cal, carbs: parseFloat(carbs) || 0,
        protein: parseFloat(protein) || 0, fat: parseFloat(fat) || 0,
      },
    })
    toast(`Añadido a ${MEAL_LABELS[meal]}`, { icon: 'check' })
    setName(''); setCalories(''); setCarbs(''); setProtein(''); setFat('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registro rápido">
      <div className="col gap-3" style={{ paddingBottom: 10 }}>
        <p className="cap dim">Registra calorías sueltas o macros exactos sin buscar el alimento.</p>
        <div className="chip-row">
          {DEFAULT_MEALS.map((m) => (
            <button key={m} className={`chip ${meal === m ? 'chip--active' : ''}`} onClick={() => setMeal(m)}>
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="field">
          <span className="label">Nombre (opcional)</span>
          <input className="input" placeholder="p. ej. Comida fuera" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Calorías</span>
          <div className="input-suffix">
            <input className="input" inputMode="numeric" placeholder={macroCals ? String(Math.round(macroCals)) : '0'}
              value={calories} onChange={(e) => setCalories(e.target.value)} />
            <span>kcal</span>
          </div>
        </div>
        <div className="row gap-2">
          <MacroInput label="Carbos" color="var(--carbs)" value={carbs} onChange={setCarbs} />
          <MacroInput label="Proteína" color="var(--protein)" value={protein} onChange={setProtein} />
          <MacroInput label="Grasa" color="var(--fat)" value={fat} onChange={setFat} />
        </div>
        <button className="btn btn--grad btn--full" onClick={save}>Añadir</button>
      </div>
    </Sheet>
  )
}

function MacroInput({ label, color, value, onChange }: { label: string; color: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field grow">
      <span className="label" style={{ color }}>{label}</span>
      <div className="input-suffix">
        <input className="input" inputMode="decimal" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} style={{ paddingRight: 26 }} />
        <span>g</span>
      </div>
    </div>
  )
}
