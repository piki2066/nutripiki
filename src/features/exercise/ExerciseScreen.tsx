import { useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { Segmented, Stepper, EmptyState } from '@/components/ui'
import {
  useProfile, useWeights, useDayExercise, useDaySteps, useExerciseDefs,
} from '@/hooks/useData'
import type { ExerciseDef, ExerciseKind } from '@/db/types'
import { logExercise, deleteExercise, setSteps } from '@/db/repo'
import { caloriesFromMet, caloriesFromSteps } from '@/lib/nutrition'
import { latestWeight, exerciseCalories } from '@/lib/selectors'
import { fmtKcal } from '@/lib/format'
import { useUI } from '@/lib/store'
import { friendlyDate, shiftKey, todayKey } from '@/lib/date'

export default function ExerciseScreen() {
  const date = useUI((s) => s.currentDate)
  const setDate = useUI((s) => s.setCurrentDate)
  const toast = useUI((s) => s.toast)
  const profile = useProfile()
  const weights = useWeights() ?? []
  const entries = useDayExercise(date) ?? []
  const steps = useDaySteps(date)
  const defs = useExerciseDefs() ?? []

  const [addOpen, setAddOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)

  if (!profile) return null
  const weight = latestWeight(weights, profile.weightStartKg)
  const exKcal = exerciseCalories(entries, steps?.caloriesBurned ?? 0)

  return (
    <div className="screen">
      <AppHeader back title="Ejercicio"
        trailing={
          <div className="row center gap-1">
            <button className="icon-btn" onClick={() => setDate(shiftKey(date, -1))}><Icon name="chevron-left" size={20} /></button>
            <span className="cap" style={{ minWidth: 56, textAlign: 'center' }}>{friendlyDate(date)}</span>
            <button className="icon-btn" onClick={() => setDate(shiftKey(date, 1))}><Icon name="chevron-right" size={20} /></button>
          </div>
        } />

      <div className="card col gap-1" style={{ alignItems: 'center', marginBottom: 14 }}>
        <Icon name="flame" size={28} fill color="var(--brand-2)" />
        <div className="big-num" style={{ fontSize: 36, color: 'var(--brand-2)' }}>{fmtKcal(exKcal)}</div>
        <span className="cap">calorías quemadas {date !== todayKey() ? `· ${friendlyDate(date)}` : 'hoy'}</span>
      </div>

      {/* Pasos */}
      <button className="card card--tap row between" style={{ marginBottom: 14, width: '100%' }} onClick={() => setStepsOpen(true)}>
        <div className="row gap-3">
          <div className="center-all" style={{ width: 40, height: 40, borderRadius: 11, background: 'color-mix(in srgb, var(--carbs) 16%, transparent)' }}>
            <Icon name="steps" size={22} color="var(--carbs)" />
          </div>
          <div className="col" style={{ alignItems: 'flex-start' }}>
            <span className="h3">{fmtKcal(steps?.steps ?? 0)} pasos</span>
            <span className="cap dim">{fmtKcal(steps?.caloriesBurned ?? 0)} kcal · meta {fmtKcal(profile.stepGoal)}</span>
          </div>
        </div>
        <Icon name="edit" size={18} color="var(--text-3)" />
      </button>

      <div className="section-title" style={{ marginBottom: 6 }}>Actividades</div>
      {entries.length === 0 && <EmptyState icon="dumbbell" title="Sin ejercicios" sub="Registra cardio o entrenamiento de fuerza." />}
      {entries.length > 0 && (
        <div className="list">
          {entries.map((e) => (
            <div key={e.id} className="list-item">
              <Icon name={e.kind === 'cardio' ? 'flame' : 'dumbbell'} size={22} color={e.kind === 'cardio' ? 'var(--brand-2)' : 'var(--protein)'} />
              <div className="col" style={{ gap: 1, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                <span className="list-item__title ellipsis">{e.name}</span>
                <span className="list-item__sub">
                  {e.kind === 'cardio'
                    ? `${e.durationMin} min`
                    : `${e.sets ?? 0}×${e.reps ?? 0}${e.weightKg ? ` · ${e.weightKg} kg` : ''}`}
                </span>
              </div>
              <span className="tabnum" style={{ fontWeight: 700, color: 'var(--brand-2)' }}>{fmtKcal(e.caloriesBurned)}</span>
              <button className="icon-btn" onClick={() => deleteExercise(e.id)} aria-label="Quitar"><Icon name="trash" size={18} color="var(--text-3)" /></button>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn--grad btn--full" style={{ marginTop: 16 }} onClick={() => setAddOpen(true)}>
        <Icon name="plus" size={20} /> Registrar ejercicio
      </button>

      <AddExerciseSheet open={addOpen} onClose={() => setAddOpen(false)} date={date} defs={defs} weight={weight}
        onSaved={() => toast('Ejercicio registrado', { icon: 'check' })} />

      <StepsSheet open={stepsOpen} onClose={() => setStepsOpen(false)} date={date} weight={weight}
        current={steps?.steps ?? 0} />
    </div>
  )
}

function AddExerciseSheet({ open, onClose, date, defs, weight, onSaved }: {
  open: boolean; onClose: () => void; date: string; defs: ExerciseDef[]; weight: number; onSaved: () => void
}) {
  const [kind, setKind] = useState<ExerciseKind>('cardio')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<ExerciseDef | null>(null)
  const [minutes, setMinutes] = useState(30)
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weightKg, setWeightKg] = useState(20)
  const [calories, setCalories] = useState(0)

  const filtered = useMemo(() =>
    defs.filter((d) => d.kind === kind && d.name.toLowerCase().includes(q.toLowerCase())),
    [defs, kind, q])

  const estCardio = selected ? caloriesFromMet(selected.met, weight, minutes) : 0
  const estStrength = selected ? caloriesFromMet(selected.met, weight, Math.max(10, sets * 2)) : 0
  const finalCals = calories || (kind === 'cardio' ? estCardio : estStrength)

  async function save() {
    if (!selected) return
    await logExercise({
      date, kind, name: selected.name, exerciseId: selected.id,
      caloriesBurned: finalCals,
      durationMin: kind === 'cardio' ? minutes : undefined,
      sets: kind === 'strength' ? sets : undefined,
      reps: kind === 'strength' ? reps : undefined,
      weightKg: kind === 'strength' ? weightKg : undefined,
    })
    onSaved()
    setSelected(null); setQ(''); setCalories(0)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} full title="Registrar ejercicio"
      trailing={selected ? <button className="chip chip--active" onClick={save}>Guardar</button> : undefined}>
      <div className="col gap-3">
        <Segmented value={kind} onChange={(k) => { setKind(k); setSelected(null) }} options={[
          { value: 'cardio', label: 'Cardio' }, { value: 'strength', label: 'Fuerza' },
        ]} />

        {!selected ? (
          <>
            <div className="input-suffix">
              <input className="input" style={{ paddingLeft: 42 }} placeholder="Buscar ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Icon name="search" size={20} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: 15 }} />
            </div>
            <div className="list">
              {filtered.map((d) => (
                <button key={d.id} className="list-item list-item--tap" onClick={() => setSelected(d)}>
                  <Icon name={d.kind === 'cardio' ? 'flame' : 'dumbbell'} size={20} color="var(--text-2)" />
                  <span className="list-item__title">{d.name}</span>
                  <span className="cap dim" style={{ marginLeft: 'auto' }}>MET {d.met}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="col gap-3">
            <div className="card row between">
              <span className="h3">{selected.name}</span>
              <button className="cap t-cal" onClick={() => setSelected(null)} style={{ fontWeight: 700 }}>Cambiar</button>
            </div>

            {kind === 'cardio' ? (
              <div className="row between">
                <span className="label" style={{ margin: 0 }}>Duración (min)</span>
                <Stepper value={minutes} onChange={setMinutes} step={5} min={1} max={600} />
              </div>
            ) : (
              <>
                <div className="row between"><span className="label" style={{ margin: 0 }}>Series</span><Stepper value={sets} onChange={setSets} min={1} max={50} /></div>
                <div className="row between"><span className="label" style={{ margin: 0 }}>Repeticiones</span><Stepper value={reps} onChange={setReps} min={1} max={100} /></div>
                <div className="row between"><span className="label" style={{ margin: 0 }}>Peso (kg)</span><Stepper value={weightKg} onChange={setWeightKg} step={2.5} min={0} max={500} decimals={1} /></div>
              </>
            )}

            <div className="card col gap-1" style={{ alignItems: 'center' }}>
              <span className="label">Calorías estimadas</span>
              <div className="big-num" style={{ fontSize: 30, color: 'var(--brand-2)' }}>{fmtKcal(finalCals)}</div>
              <div className="input-suffix" style={{ width: 160, marginTop: 6 }}>
                <input className="input" inputMode="numeric" placeholder={`${kind === 'cardio' ? estCardio : estStrength} (auto)`}
                  value={calories || ''} onChange={(e) => setCalories(parseFloat(e.target.value) || 0)} style={{ textAlign: 'center' }} />
                <span style={{ top: '50%' }}>kcal</span>
              </div>
              <span className="cap dim">Edítalas si lo prefieres</span>
            </div>

            <button className="btn btn--grad btn--full" onClick={save}>Guardar ejercicio</button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function StepsSheet({ open, onClose, date, weight, current }: { open: boolean; onClose: () => void; date: string; weight: number; current: number }) {
  const [steps, setStepsVal] = useState(current)
  const toast = useUI((s) => s.toast)
  async function save() {
    await setSteps(date, steps, caloriesFromSteps(steps, weight))
    toast('Pasos guardados', { icon: 'check' })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Pasos del día">
      <div className="col gap-3" style={{ paddingBottom: 10 }}>
        <div className="field">
          <span className="label">Pasos</span>
          <input className="input" type="number" inputMode="numeric" value={steps} onChange={(e) => setStepsVal(parseInt(e.target.value) || 0)}
            onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 24, fontWeight: 700 }} autoFocus />
        </div>
        <p className="cap dim">≈ {fmtKcal(caloriesFromSteps(steps, weight))} kcal quemadas</p>
        <button className="btn btn--grad btn--full" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  )
}
