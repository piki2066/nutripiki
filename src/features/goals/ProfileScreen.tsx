import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Segmented } from '@/components/ui'
import { useProfile } from '@/hooks/useData'
import { saveProfile } from '@/db/repo'
import { buildProfile } from '@/lib/profile'
import { ACTIVITY_LABELS } from '@/lib/nutrition'
import type { ActivityLevel, GoalType, Sex } from '@/db/types'
import { ageFromBirth } from '@/lib/nutrition'
import { kgToDisplay, displayToKg, cmToDisplay, displayToCm, weightUnit, lengthUnit } from '@/lib/units'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'

export default function ProfileScreen() {
  const profile = useProfile()
  const toast = useUI((s) => s.toast)
  const [edited, setEdited] = useState(false)

  // Estado local de edición
  const [name, setName] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [birthDate, setBirthDate] = useState('')
  const [height, setHeight] = useState(0)
  const [activity, setActivity] = useState<ActivityLevel>('light')
  const [goalType, setGoalType] = useState<GoalType>('lose')
  const [pace, setPace] = useState(0.5)
  const [goalWeight, setGoalWeight] = useState(0)
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [ready, setReady] = useState(false)

  // Inicializa al cargar el perfil
  if (profile && !ready) {
    setName(profile.name); setSex(profile.sex); setBirthDate(profile.birthDate)
    setHeight(profile.heightCm); setActivity(profile.activityLevel); setGoalType(profile.goalType)
    setPace(profile.paceKgPerWeek || 0.5); setGoalWeight(profile.weightGoalKg); setUnits(profile.units)
    setReady(true)
  }
  if (!profile) return null

  const touch = () => setEdited(true)

  async function save() {
    const updated = buildProfile({
      name, sex, birthDate, heightCm: height,
      weightStartKg: profile!.weightStartKg, weightGoalKg: goalWeight,
      goalType, paceKgPerWeek: pace, activityLevel: activity, units,
    }, profile!)
    await saveProfile(updated)
    toast('Perfil actualizado', { icon: 'check' })
    setEdited(false)
  }

  return (
    <div className="screen">
      <AppHeader back title="Perfil"
        trailing={edited ? <button className="chip chip--active" onClick={save}>Guardar</button> : undefined} />

      {/* Avatar */}
      <div className="col" style={{ alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div className="center-all" style={{ width: 84, height: 84, borderRadius: 999, background: 'var(--brand-grad)', fontSize: 34, fontWeight: 800, color: '#fff' }}>
          {name ? name[0].toUpperCase() : '🙂'}
        </div>
        <div className="h2">{name}</div>
        <div className="cap dim">{ageFromBirth(birthDate)} años · {fmtNum(cmToDisplay(height, units))} {lengthUnit(units)}</div>
      </div>

      {/* Resumen metabólico */}
      <div className="card row between" style={{ marginBottom: 16 }}>
        <Metric label="BMR" value={fmtKcal(profile.bmr)} />
        <Metric label="TDEE" value={fmtKcal(profile.tdee)} />
        <Metric label="Objetivo" value={fmtKcal(profile.calorieGoal)} accent="var(--cal)" />
      </div>

      <div className="section-title">Datos personales</div>
      <div className="col gap-3">
        <div className="field">
          <span className="label">Nombre</span>
          <input className="input" value={name} onChange={(e) => { setName(e.target.value); touch() }} />
        </div>
        <div className="field">
          <span className="label">Sexo biológico</span>
          <Segmented value={sex} onChange={(v) => { setSex(v); touch() }} options={[{ value: 'male', label: 'Hombre' }, { value: 'female', label: 'Mujer' }]} />
        </div>
        <div className="row gap-2">
          <div className="field grow">
            <span className="label">Nacimiento</span>
            <input className="input" type="date" value={birthDate} max="2015-12-31" onChange={(e) => { setBirthDate(e.target.value); touch() }} />
          </div>
          <div className="field">
            <span className="label">Altura</span>
            <div className="input-suffix">
              <input className="input" type="number" inputMode="decimal" value={fmtNum(cmToDisplay(height, units))}
                onChange={(e) => { setHeight(displayToCm(parseFloat(e.target.value) || 0, units)); touch() }} style={{ width: 110 }} />
              <span>{lengthUnit(units)}</span>
            </div>
          </div>
        </div>
        <div className="field">
          <span className="label">Unidades</span>
          <Segmented value={units} onChange={(v) => { setUnits(v); touch() }} options={[{ value: 'metric', label: 'Métrico' }, { value: 'imperial', label: 'Imperial' }]} />
        </div>
      </div>

      <div className="section-title">Nivel de actividad</div>
      <div className="field">
        <select className="select" value={activity} onChange={(e) => { setActivity(e.target.value as ActivityLevel); touch() }}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
            <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
          ))}
        </select>
      </div>

      <div className="section-title">Objetivo de peso</div>
      <div className="col gap-3">
        <div className="field">
          <span className="label">Quiero</span>
          <Segmented value={goalType} onChange={(v) => { setGoalType(v); touch() }} options={[
            { value: 'lose', label: 'Perder' }, { value: 'maintain', label: 'Mantener' }, { value: 'gain', label: 'Ganar' },
          ]} />
        </div>
        {goalType !== 'maintain' && (
          <>
            <div className="field">
              <span className="label">Peso objetivo</span>
              <div className="input-suffix">
                <input className="input" type="number" inputMode="decimal" value={fmtNum(kgToDisplay(goalWeight, units))}
                  onChange={(e) => { setGoalWeight(displayToKg(parseFloat(e.target.value) || 0, units)); touch() }} />
                <span>{weightUnit(units)}</span>
              </div>
            </div>
            <div className="field">
              <span className="label">Ritmo semanal</span>
              <select className="select" value={pace} onChange={(e) => { setPace(parseFloat(e.target.value)); touch() }}>
                {(goalType === 'gain' ? [0.25, 0.5] : [0.25, 0.5, 0.75, 1]).map((p) => (
                  <option key={p} value={p}>{p} kg / semana</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {edited && (
        <button className="btn btn--grad btn--full" style={{ marginTop: 20 }} onClick={save}>
          <Icon name="check" size={20} /> Guardar y recalcular objetivos
        </button>
      )}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 2, flex: 1 }}>
      <span className="big-num" style={{ fontSize: 20, color: accent }}>{value}</span>
      <span className="label" style={{ margin: 0 }}>{label}</span>
    </div>
  )
}
