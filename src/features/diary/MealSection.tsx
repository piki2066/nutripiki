import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { ListRow } from '@/components/ui'
import type { FoodEntry, MealName } from '@/db/types'
import { MEAL_LABELS } from '@/db/types'
import { mealTotals } from '@/lib/selectors'
import { copyMealToDate, rememberMeal, setEntryDone } from '@/db/repo'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'
import { shiftKey, friendlyDate } from '@/lib/date'

interface Props {
  meal: MealName
  date: string
  entries: FoodEntry[]
  onEntry: (e: FoodEntry) => void
  showMacros: boolean
}

export function MealSection({ meal, date, entries, onEntry, showMacros }: Props) {
  const nav = useNavigate()
  const toast = useUI((s) => s.toast)
  const mealEntries = entries.filter((e) => e.meal === meal)
  const totals = mealTotals(entries, meal)
  const [tools, setTools] = useState(false)
  const [copyMode, setCopyMode] = useState<null | 'to' | 'from'>(null)
  const [remember, setRemember] = useState(false)
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState(shiftKey(date, 1))

  async function doCopy() {
    if (copyMode === 'to') {
      const n = await copyMealToDate(date, meal, targetDate)
      toast(`${n} copiados a ${friendlyDate(targetDate)}`, { icon: 'check' })
    } else if (copyMode === 'from') {
      const n = await copyMealToDate(targetDate, meal, date)
      toast(`${n} copiados desde ${friendlyDate(targetDate)}`, { icon: 'check' })
    }
    setCopyMode(null); setTools(false)
  }

  async function doRemember() {
    if (!name.trim()) return
    await rememberMeal(name, mealEntries)
    toast(`Comida "${name}" guardada`, { icon: 'check' })
    setRemember(false); setName(''); setTools(false)
  }

  return (
    <div className="card card--flush" style={{ marginBottom: 12 }}>
      <div className="row between" style={{ padding: '12px 16px', borderBottom: mealEntries.length ? '1px solid var(--hairline)' : 'none' }}>
        <div className="row gap-2">
          <span className="h3">{MEAL_LABELS[meal]}</span>
          {totals.calories > 0 && <span className="badge badge--soft tabnum">{fmtKcal(totals.calories)} kcal</span>}
        </div>
        <button className="icon-btn" onClick={() => setTools(true)} aria-label="Opciones"><Icon name="more" size={20} /></button>
      </div>

      {mealEntries.map((e) => {
        const planned = e.done === false
        return (
          <div key={e.id} className="row" style={{ alignItems: 'stretch' }}>
            {planned && (
              <button className="center-all" onClick={() => setEntryDone(e.id, true)} aria-label="Marcar como comido"
                style={{ width: 40, flexShrink: 0, background: 'none' }}>
                <span className="center-all" style={{ width: 22, height: 22, borderRadius: 999, border: '1px solid var(--hairline-strong)', color: 'var(--text-3)' }} />
              </button>
            )}
            <button className="list-item list-item--tap" onClick={() => onEntry(e)} style={{ minHeight: 50, flex: 1, minWidth: 0, opacity: planned ? 0.6 : 1 }}>
              <div className="col" style={{ gap: 1, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                <span className="list-item__title ellipsis" style={{ fontSize: 14 }}>
                  {e.isQuickAdd && <Icon name="bolt" size={12} color="var(--carbs)" style={{ marginRight: 4, display: 'inline' }} />}
                  {e.name}
                </span>
                <span className="list-item__sub ellipsis">
                  {e.quantity !== 1 ? `${fmtNum(e.quantity)} × ` : ''}{e.servingLabel}
                  {planned && ' · planificado'}
                  {showMacros && ` · C${fmtNum(e.nutrients.carbs)} P${fmtNum(e.nutrients.protein)} G${fmtNum(e.nutrients.fat)}`}
                </span>
              </div>
              <span className="tabnum" style={{ fontWeight: 700 }}>{fmtKcal(e.nutrients.calories)}</span>
            </button>
          </div>
        )
      })}

      <button className="list-item list-item--tap" style={{ color: 'var(--brand)', minHeight: 46 }}
        onClick={() => nav(`/add?date=${date}&meal=${meal}`)}>
        <Icon name="plus-circle" size={20} />
        <span style={{ fontWeight: 650, fontSize: 14 }}>Añadir alimento</span>
      </button>

      {/* Quick Tools */}
      <Sheet open={tools} onClose={() => setTools(false)} title={`${MEAL_LABELS[meal]} · opciones`}>
        <div className="list">
          <ListRow icon="plus-circle" title="Añadir alimento" onClick={() => { setTools(false); nav(`/add?date=${date}&meal=${meal}`) }} />
          <ListRow icon="copy" title="Copiar a otra fecha" sub="Duplica esta comida en otro día" onClick={() => setCopyMode('to')} />
          <ListRow icon="calendar" title="Copiar desde otra fecha" onClick={() => setCopyMode('from')} />
          <ListRow icon="meal" title="Recordar comida" sub="Guárdala para reutilizarla" onClick={() => setRemember(true)} />
        </div>
      </Sheet>

      {/* Copiar fecha */}
      <Sheet open={!!copyMode} onClose={() => setCopyMode(null)} title={copyMode === 'to' ? 'Copiar a fecha' : 'Copiar desde fecha'}>
        <div className="col gap-3" style={{ paddingBottom: 10 }}>
          <div className="field">
            <span className="label">Fecha</span>
            <input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <button className="btn btn--grad btn--full" onClick={doCopy}>Copiar {mealEntries.length} alimentos</button>
        </div>
      </Sheet>

      {/* Recordar comida */}
      <Sheet open={remember} onClose={() => setRemember(false)} title="Recordar comida">
        <div className="col gap-3" style={{ paddingBottom: 10 }}>
          <div className="field">
            <span className="label">Nombre</span>
            <input className="input" autoFocus placeholder="p. ej. Mi desayuno habitual" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn btn--grad btn--full" onClick={doRemember} disabled={!mealEntries.length}>Guardar comida</button>
          {!mealEntries.length && <p className="cap dim">Añade alimentos a esta comida primero.</p>}
        </div>
      </Sheet>
    </div>
  )
}
