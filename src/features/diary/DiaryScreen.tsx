import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { MealSection } from './MealSection'
import { EntryEditSheet } from './EntryEditSheet'
import { WaterSheet } from './WaterSheet'
import { ReflectSheet } from './ReflectSheet'
import {
  useProfile, useDayEntries, useDayExercise, useDayWater, useDaySteps, useDayNote, useSettings,
} from '@/hooks/useData'
import { dayTotals, exerciseCalories, calorieSummary } from '@/lib/selectors'
import { DEFAULT_MEALS, type FoodEntry } from '@/db/types'
import { saveNote, copyDay } from '@/db/repo'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'
import { friendlyDate, shiftKey, todayKey } from '@/lib/date'

export default function DiaryScreen() {
  const nav = useNavigate()
  const date = useUI((s) => s.currentDate)
  const setDate = useUI((s) => s.setCurrentDate)
  const toast = useUI((s) => s.toast)
  const copiedDate = useUI((s) => s.copiedDate)
  const setCopiedDate = useUI((s) => s.setCopiedDate)
  const profile = useProfile()
  const settings = useSettings()
  const entries = useDayEntries(date) ?? []
  const exercise = useDayExercise(date) ?? []
  const water = useDayWater(date) ?? []
  const steps = useDaySteps(date)
  const note = useDayNote(date)

  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null)
  const [waterOpen, setWaterOpen] = useState(false)
  const [reflect, setReflect] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showMacros, setShowMacros] = useState(false)

  useEffect(() => { setNoteText(note?.text ?? '') }, [note?.text])

  if (!profile) return null

  const totals = dayTotals(entries)
  const exKcal = exerciseCalories(exercise, steps?.caloriesBurned ?? 0)
  const sum = calorieSummary(profile, date, totals, exKcal)
  const waterMl = water.reduce((s, w) => s + w.amountMl, 0)
  const over = sum.remaining < 0

  return (
    <div className="screen">
      <AppHeader
        center={
          <div className="row center gap-2" style={{ flex: 1 }}>
            <button className="icon-btn" onClick={() => setDate(shiftKey(date, -1))} aria-label="Día anterior"><Icon name="chevron-left" size={22} /></button>
            <label className="row gap-1" style={{ position: 'relative', fontWeight: 750 }}>
              {friendlyDate(date)}
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%' }} />
              <Icon name="chevron-down" size={16} color="var(--text-3)" />
            </label>
            <button className="icon-btn" onClick={() => setDate(shiftKey(date, 1))} aria-label="Día siguiente"><Icon name="chevron-right" size={22} /></button>
          </div>
        }
        trailing={
          date !== todayKey()
            ? <button className="chip" onClick={() => setDate(todayKey())}>Hoy</button>
            : <button className="icon-btn" onClick={() => setShowMacros((v) => !v)} aria-label="Macros"><Icon name="list" size={20} color={showMacros ? 'var(--brand)' : undefined} /></button>
        }
      />

      {/* Resumen de calorías */}
      <div className="card card--glow" style={{ marginBottom: 14 }}>
        <div className="row between tabnum" style={{ marginBottom: 10 }}>
          <Col label="Objetivo" value={fmtKcal(sum.goal)} />
          <span className="dim">−</span>
          <Col label="Comida" value={fmtKcal(sum.food)} />
          <span className="dim">+</span>
          <Col label="Ejerc." value={fmtKcal(sum.exercise)} />
          <span className="dim">=</span>
          <Col label="Restante" value={fmtKcal(sum.remaining)} accent={over ? 'var(--bad)' : 'var(--good)'} />
        </div>
        <div className={`cal-progress ${over ? 'over' : ''}`}>
          <span style={{ width: `${Math.min(100, (sum.food / (sum.goal + sum.exercise)) * 100)}%` }} />
        </div>
        <div className="row between" style={{ marginTop: 12 }}>
          <Macro label="Carbos" v={totals.carbs} g={profile.macros.carbsG} color="var(--carbs)" />
          <Macro label="Proteína" v={totals.protein} g={profile.macros.proteinG} color="var(--protein)" />
          <Macro label="Grasa" v={totals.fat} g={profile.macros.fatG} color="var(--fat)" />
        </div>
      </div>

      {/* Copiar / pegar día */}
      {(entries.length > 0 || (copiedDate && copiedDate !== date)) && (
        <div className="row gap-2" style={{ marginBottom: 12 }}>
          {entries.length > 0 && (
            <button className="btn btn--soft btn--sm grow" onClick={() => { setCopiedDate(date); toast('Día copiado · abre otro día y pulsa Pegar', { icon: 'check' }) }}>
              <Icon name="copy" size={16} /> Copiar día
            </button>
          )}
          {copiedDate && copiedDate !== date && (
            <button className="btn btn--soft btn--sm grow" onClick={async () => {
              const n = await copyDay(copiedDate, date)
              toast(n ? `${n} comidas pegadas de ${friendlyDate(copiedDate)}` : 'Ese día no tenía comidas', { icon: n ? 'check' : 'info' })
            }}>
              <Icon name="download" size={16} /> Pegar de {friendlyDate(copiedDate)}
            </button>
          )}
        </div>
      )}

      {/* Copiar de ayer cuando el día está vacío */}
      {entries.length === 0 && (
        <button className="btn btn--soft btn--full" style={{ marginBottom: 12 }}
          onClick={async () => {
            const n = await copyDay(shiftKey(date, -1), date)
            toast(n ? `${n} alimentos copiados de ayer` : 'Ayer no tiene registros', { icon: n ? 'check' : 'info' })
          }}>
          <Icon name="copy" size={18} /> Copiar comidas de ayer
        </button>
      )}

      {/* Comidas */}
      {DEFAULT_MEALS.map((m) => (
        <MealSection key={m} meal={m} date={date} entries={entries} onEntry={setEditEntry} showMacros={showMacros} />
      ))}

      {/* Agua */}
      <button className="card card--tap row between" style={{ marginBottom: 12, width: '100%' }} onClick={() => setWaterOpen(true)}>
        <div className="row gap-3">
          <div className="center-all" style={{ width: 38, height: 38, borderRadius: 10, background: 'color-mix(in srgb, var(--brand) 16%, transparent)' }}>
            <Icon name="water" size={20} color="var(--brand)" fill />
          </div>
          <div className="col" style={{ alignItems: 'flex-start' }}>
            <span className="h3">Agua</span>
            <span className="cap dim">{fmtNum(waterMl / 1000)} L de {fmtNum(profile.waterGoalMl / 1000)} L</span>
          </div>
        </div>
        <Icon name="plus-circle" size={24} color="var(--brand)" />
      </button>

      {/* Ejercicio */}
      <button className="card card--tap row between" style={{ marginBottom: 12, width: '100%' }} onClick={() => nav('/exercise')}>
        <div className="row gap-3">
          <div className="center-all" style={{ width: 38, height: 38, borderRadius: 10, background: 'color-mix(in srgb, var(--brand-2) 16%, transparent)' }}>
            <Icon name="dumbbell" size={20} color="var(--brand-2)" />
          </div>
          <div className="col" style={{ alignItems: 'flex-start' }}>
            <span className="h3">Ejercicio</span>
            <span className="cap dim">{exKcal > 0 ? `${fmtKcal(exKcal)} kcal quemadas` : 'Sin registrar'}</span>
          </div>
        </div>
        <Icon name="chevron-right" size={22} color="var(--text-3)" />
      </button>

      {/* Nota del día */}
      <button className="card card--tap row between" style={{ marginBottom: 14, width: '100%' }} onClick={() => setNoteOpen(true)}>
        <div className="row gap-3" style={{ minWidth: 0 }}>
          <div className="center-all" style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--fill)' }}>
            <Icon name="note" size={20} color="var(--text-2)" />
          </div>
          <div className="col" style={{ alignItems: 'flex-start', minWidth: 0 }}>
            <span className="h3">Nota del día</span>
            <span className="cap dim ellipsis" style={{ maxWidth: 220 }}>{note?.text || 'Añade una nota…'}</span>
          </div>
        </div>
        <Icon name="edit" size={18} color="var(--text-3)" />
      </button>

      <button className="btn btn--grad btn--full" onClick={() => setReflect(true)}>
        <Icon name="check-circle" size={20} /> Completar día
      </button>

      <EntryEditSheet entry={editEntry} open={!!editEntry} onClose={() => setEditEntry(null)} />
      <WaterSheet open={waterOpen} onClose={() => setWaterOpen(false)} date={date} />
      <ReflectSheet open={reflect} onClose={() => setReflect(false)} date={date} summary={sum} />

      <Sheet open={noteOpen} onClose={() => { saveNote(date, noteText); setNoteOpen(false) }} title="Nota del día">
        <div className="col gap-3" style={{ paddingBottom: 10 }}>
          <textarea className="textarea" autoFocus placeholder="¿Cómo te has sentido hoy? Antojos, energía, sueño…"
            value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <button className="btn btn--grad btn--full" onClick={() => { saveNote(date, noteText); setNoteOpen(false) }}>Guardar nota</button>
        </div>
      </Sheet>
    </div>
  )
}

function Col({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 1 }}>
      <span className="big-num" style={{ fontSize: 17, color: accent }}>{value}</span>
      <span className="label" style={{ margin: 0, fontSize: 10 }}>{label}</span>
    </div>
  )
}

function Macro({ label, v, g, color }: { label: string; v: number; g: number; color: string }) {
  const pct = g > 0 ? Math.min(100, (v / g) * 100) : 0
  return (
    <div className="col gap-1" style={{ flex: 1, margin: '0 4px' }}>
      <div className="row between"><span className="cap" style={{ fontSize: 11 }}>{label}</span></div>
      <div className="macro-bar"><span style={{ width: `${pct}%`, background: color }} /></div>
      <span className="cap dim tabnum" style={{ fontSize: 11 }}>{fmtNum(v)}/{g}g</span>
    </div>
  )
}
