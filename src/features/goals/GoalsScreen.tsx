import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Segmented, Stepper, Toggle } from '@/components/ui'
import { Sheet } from '@/components/Sheet'
import { useProfile } from '@/hooks/useData'
import { patchProfile } from '@/db/repo'
import { macrosFromPercent, macrosFromGrams, caloriesFromMacros } from '@/lib/nutrition'
import type { MacroGoals, MicroGoals } from '@/db/types'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function GoalsScreen() {
  const profile = useProfile()
  const toast = useUI((s) => s.toast)
  const [calOpen, setCalOpen] = useState(false)
  const [macroOpen, setMacroOpen] = useState(false)
  const [dayOpen, setDayOpen] = useState(false)
  const [microOpen, setMicroOpen] = useState(false)

  if (!profile) return null
  const m = profile.macros

  return (
    <div className="screen">
      <AppHeader back title="Objetivos" />

      {/* Calorías */}
      <div className="card col gap-2" style={{ alignItems: 'center', marginBottom: 14 }}>
        <span className="label">Objetivo diario</span>
        <div className="big-num t-cal" style={{ fontSize: 46 }}>{fmtKcal(profile.calorieGoal)}</div>
        <span className="cap dim">kcal {profile.manualCalories ? '· fijado a mano' : '· calculado (Mifflin-St Jeor)'}</span>
        <button className="btn btn--soft btn--sm" onClick={() => setCalOpen(true)} style={{ marginTop: 6 }}>
          <Icon name="edit" size={16} /> Editar calorías
        </button>
      </div>

      {/* Macros */}
      <button className="card card--tap col gap-3" style={{ width: '100%', marginBottom: 14 }} onClick={() => setMacroOpen(true)}>
        <div className="row between">
          <span className="h3">Macronutrientes</span>
          <span className="cap t-cal" style={{ fontWeight: 700 }}>Editar ›</span>
        </div>
        <div className="row between">
          <MacroCol label="Carbohidratos" g={m.carbsG} pct={m.carbsPct} color="var(--carbs)" />
          <MacroCol label="Proteínas" g={m.proteinG} pct={m.proteinPct} color="var(--protein)" />
          <MacroCol label="Grasas" g={m.fatG} pct={m.fatPct} color="var(--fat)" />
        </div>
        <div className="row gap-1" style={{ height: 8 }}>
          <span style={{ flex: m.carbsPct, background: 'var(--carbs)', borderRadius: 4 }} />
          <span style={{ flex: m.proteinPct, background: 'var(--protein)', borderRadius: 4 }} />
          <span style={{ flex: m.fatPct, background: 'var(--fat)', borderRadius: 4 }} />
        </div>
      </button>

      <div className="section-title">Avanzado</div>
      <div className="list">
        <Row icon="calendar" title="Objetivos por día" sub="Calorías distintas según el día de la semana" onClick={() => setDayOpen(true)} />
        <Row icon="target" title="Micronutrientes" sub="Fibra, azúcar, sodio, vitaminas…" onClick={() => setMicroOpen(true)} />
      </div>

      {/* Comportamiento */}
      <div className="section-title">Ajustes del objetivo</div>
      <div className="list">
        <div className="list-item">
          <Icon name="flame" size={22} color="var(--brand-2)" />
          <div className="col" style={{ gap: 1, flex: 1, alignItems: 'flex-start' }}>
            <span className="list-item__title">Sumar calorías de ejercicio</span>
            <span className="list-item__sub">"Cómete" las calorías que quemas (modo NEAT)</span>
          </div>
          <Toggle on={profile.addExerciseCalories} onChange={(v) => patchProfile({ addExerciseCalories: v })} />
        </div>
        <div className="list-item">
          <Icon name="water" size={22} color="var(--brand)" />
          <span className="list-item__title grow">Objetivo de agua (ml)</span>
          <Stepper value={profile.waterGoalMl} onChange={(v) => patchProfile({ waterGoalMl: v })} step={250} min={500} max={6000} />
        </div>
        <div className="list-item">
          <Icon name="steps" size={22} color="var(--carbs)" />
          <span className="list-item__title grow">Objetivo de pasos</span>
          <Stepper value={profile.stepGoal} onChange={(v) => patchProfile({ stepGoal: v })} step={1000} min={1000} max={40000} />
        </div>
      </div>

      <CaloriesSheet open={calOpen} onClose={() => setCalOpen(false)} profile={profile} onSaved={() => toast('Calorías actualizadas', { icon: 'check' })} />
      <MacrosSheet open={macroOpen} onClose={() => setMacroOpen(false)} calories={profile.calorieGoal} macros={m} onSaved={() => toast('Macros actualizados', { icon: 'check' })} />
      <DayGoalsSheet open={dayOpen} onClose={() => setDayOpen(false)} base={profile.calorieGoal} value={profile.caloriesByDay ?? {}} onSaved={() => toast('Guardado', { icon: 'check' })} />
      <MicrosSheet open={microOpen} onClose={() => setMicroOpen(false)} micros={profile.micros} onSaved={() => toast('Micronutrientes guardados', { icon: 'check' })} />
    </div>
  )
}

function Row({ icon, title, sub, onClick }: { icon: 'calendar' | 'target'; title: string; sub: string; onClick: () => void }) {
  return (
    <button className="list-item list-item--tap" onClick={onClick}>
      <Icon name={icon} size={22} color="var(--brand)" />
      <div className="col" style={{ gap: 1, flex: 1, alignItems: 'flex-start' }}>
        <span className="list-item__title">{title}</span>
        <span className="list-item__sub">{sub}</span>
      </div>
      <Icon name="chevron-right" size={18} color="var(--text-3)" />
    </button>
  )
}

function MacroCol({ label, g, pct, color }: { label: string; g: number; pct: number; color: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 1 }}>
      <span className="big-num" style={{ fontSize: 20, color }}>{g}g</span>
      <span className="cap" style={{ fontSize: 11 }}>{label}</span>
      <span className="cap dim">{pct}%</span>
    </div>
  )
}

function CaloriesSheet({ open, onClose, profile, onSaved }: { open: boolean; onClose: () => void; profile: NonNullable<ReturnType<typeof useProfile>>; onSaved: () => void }) {
  const [manual, setManual] = useState(!!profile.manualCalories)
  const [val, setVal] = useState(profile.calorieGoal)
  async function save() {
    await patchProfile({ manualCalories: manual, calorieGoal: manual ? val : profile.tdee === 0 ? val : profile.calorieGoal })
    if (!manual) await patchProfile({ manualCalories: false })
    onSaved(); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Objetivo de calorías">
      <div className="col gap-3" style={{ paddingBottom: 10 }}>
        <div className="list-item" style={{ borderRadius: 12, border: '1px solid var(--hairline)' }}>
          <div className="col" style={{ gap: 1, flex: 1, alignItems: 'flex-start' }}>
            <span className="list-item__title">Fijar calorías a mano</span>
            <span className="list-item__sub">Si lo desactivas, se calculan con tu metabolismo</span>
          </div>
          <Toggle on={manual} onChange={setManual} />
        </div>
        {manual ? (
          <div className="field">
            <span className="label">Calorías objetivo</span>
            <div className="input-suffix">
              <input className="input" type="number" inputMode="numeric" value={val} onChange={(e) => setVal(parseInt(e.target.value) || 0)} style={{ fontSize: 22, fontWeight: 700 }} />
              <span>kcal</span>
            </div>
          </div>
        ) : (
          <div className="list">
            <Info label="Metabolismo basal (BMR)" value={`${fmtKcal(profile.bmr)} kcal`} />
            <Info label="Gasto total (TDEE)" value={`${fmtKcal(profile.tdee)} kcal`} />
            <Info label="Objetivo calculado" value={`${fmtKcal(profile.calorieGoal)} kcal`} />
          </div>
        )}
        <button className="btn btn--grad btn--full" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  )
}

function MacrosSheet({ open, onClose, calories, macros, onSaved }: { open: boolean; onClose: () => void; calories: number; macros: MacroGoals; onSaved: () => void }) {
  const [mode, setMode] = useState(macros.mode)
  const [c, setC] = useState(macros.carbsPct)
  const [p, setP] = useState(macros.proteinPct)
  const [f, setF] = useState(macros.fatPct)
  const [cg, setCg] = useState(macros.carbsG)
  const [pg, setPg] = useState(macros.proteinG)
  const [fg, setFg] = useState(macros.fatG)

  const pctSum = c + p + f
  const result = mode === 'percent' ? macrosFromPercent(calories, c, p, f) : macrosFromGrams(cg, pg, fg)
  const gramCals = caloriesFromMacros({ carbsG: cg, proteinG: pg, fatG: fg })

  async function save() {
    await patchProfile({ macros: result })
    onSaved(); onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Macronutrientes">
      <div className="col gap-3" style={{ paddingBottom: 10 }}>
        <Segmented value={mode} onChange={setMode} options={[
          { value: 'percent', label: 'Por porcentaje' }, { value: 'grams', label: 'Por gramos' },
        ]} />
        {mode === 'percent' ? (
          <>
            <MacroEdit label="Carbohidratos" color="var(--carbs)" value={c} onChange={setC} suffix="%" step={5} grams={result.carbsG} />
            <MacroEdit label="Proteínas" color="var(--protein)" value={p} onChange={setP} suffix="%" step={5} grams={result.proteinG} />
            <MacroEdit label="Grasas" color="var(--fat)" value={f} onChange={setF} suffix="%" step={5} grams={result.fatG} />
            <div className="row between card" style={{ padding: 12 }}>
              <span className="label" style={{ margin: 0 }}>Suma</span>
              <span className="big-num" style={{ fontSize: 18, color: pctSum === 100 ? 'var(--good)' : 'var(--bad)' }}>{pctSum}%</span>
            </div>
            {pctSum !== 100 && <p className="cap" style={{ color: 'var(--bad)' }}>Los porcentajes deben sumar 100%.</p>}
          </>
        ) : (
          <>
            <MacroEdit label="Carbohidratos" color="var(--carbs)" value={cg} onChange={setCg} suffix="g" step={5} />
            <MacroEdit label="Proteínas" color="var(--protein)" value={pg} onChange={setPg} suffix="g" step={5} />
            <MacroEdit label="Grasas" color="var(--fat)" value={fg} onChange={setFg} suffix="g" step={5} />
            <div className="row between card" style={{ padding: 12 }}>
              <span className="label" style={{ margin: 0 }}>Equivale a</span>
              <span className="big-num t-cal" style={{ fontSize: 18 }}>{fmtKcal(gramCals)} kcal</span>
            </div>
          </>
        )}
        <button className="btn btn--grad btn--full" onClick={save} disabled={mode === 'percent' && pctSum !== 100}>Guardar macros</button>
      </div>
    </Sheet>
  )
}

function MacroEdit({ label, color, value, onChange, suffix, step, grams }: { label: string; color: string; value: number; onChange: (v: number) => void; suffix: string; step: number; grams?: number }) {
  return (
    <div className="row between">
      <div className="col" style={{ gap: 1, alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 700, color }}>{label}</span>
        {grams != null && <span className="cap dim">{grams} g</span>}
        {suffix === 'g' && <span className="cap dim">{label}</span>}
      </div>
      <div className="row gap-2">
        <Stepper value={value} onChange={onChange} step={step} min={0} max={suffix === '%' ? 100 : 1000} />
        <span className="muted" style={{ alignSelf: 'center', width: 16 }}>{suffix}</span>
      </div>
    </div>
  )
}

function DayGoalsSheet({ open, onClose, base, value, onSaved }: { open: boolean; onClose: () => void; base: number; value: Record<number, number>; onSaved: () => void }) {
  const [days, setDays] = useState<Record<number, number>>({ ...value })
  async function save() {
    const cleaned = Object.fromEntries(Object.entries(days).filter(([, v]) => v && v > 0))
    await patchProfile({ caloriesByDay: cleaned })
    onSaved(); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Objetivos por día">
      <div className="col gap-2" style={{ paddingBottom: 10 }}>
        <p className="cap dim">Deja en blanco (0) para usar el objetivo general ({fmtKcal(base)} kcal).</p>
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="row between">
            <span className="list-item__title grow">{d}</span>
            <div className="input-suffix" style={{ width: 130 }}>
              <input className="input" inputMode="numeric" placeholder={String(base)} value={days[i] || ''}
                onChange={(e) => setDays((p) => ({ ...p, [i]: parseInt(e.target.value) || 0 }))} style={{ height: 42, textAlign: 'right', paddingRight: 40 }} />
              <span style={{ top: '50%' }}>kcal</span>
            </div>
          </div>
        ))}
        <button className="btn btn--grad btn--full" onClick={save} style={{ marginTop: 8 }}>Guardar</button>
      </div>
    </Sheet>
  )
}

function MicrosSheet({ open, onClose, micros, onSaved }: { open: boolean; onClose: () => void; micros: MicroGoals; onSaved: () => void }) {
  const [m, setM] = useState<MicroGoals>({ ...micros })
  const fields: { key: keyof MicroGoals; label: string; unit: string }[] = [
    { key: 'fiber', label: 'Fibra', unit: 'g' },
    { key: 'sugar', label: 'Azúcar (límite)', unit: 'g' },
    { key: 'saturatedFat', label: 'Grasa saturada (límite)', unit: 'g' },
    { key: 'cholesterol', label: 'Colesterol (límite)', unit: 'mg' },
    { key: 'sodium', label: 'Sodio (límite)', unit: 'mg' },
    { key: 'potassium', label: 'Potasio', unit: 'mg' },
    { key: 'vitaminA', label: 'Vitamina A', unit: '%' },
    { key: 'vitaminC', label: 'Vitamina C', unit: '%' },
    { key: 'calcium', label: 'Calcio', unit: '%' },
    { key: 'iron', label: 'Hierro', unit: '%' },
  ]
  async function save() { await patchProfile({ micros: m }); onSaved(); onClose() }
  return (
    <Sheet open={open} onClose={onClose} full title="Micronutrientes">
      <div className="col gap-2" style={{ paddingBottom: 10 }}>
        {fields.map((f) => (
          <div key={f.key} className="row between">
            <span className="list-item__title grow">{f.label}</span>
            <div className="input-suffix" style={{ width: 130 }}>
              <input className="input" inputMode="numeric" value={m[f.key]} onChange={(e) => setM((p) => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                style={{ height: 42, textAlign: 'right', paddingRight: 40 }} />
              <span style={{ top: '50%' }}>{f.unit}</span>
            </div>
          </div>
        ))}
        <button className="btn btn--grad btn--full" onClick={save} style={{ marginTop: 8 }}>Guardar</button>
      </div>
    </Sheet>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-item">
      <span className="list-item__title" style={{ fontWeight: 500 }}>{label}</span>
      <span className="list-item__trail tabnum" style={{ fontWeight: 700 }}>{value}</span>
    </div>
  )
}
