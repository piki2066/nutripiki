import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Wordmark, BrandEmblem } from '@/components/Wordmark'
import { Segmented } from '@/components/ui'
import { buildProfile, type ProfileInput } from '@/lib/profile'
import { saveProfile, addWeight } from '@/db/repo'
import {
  ACTIVITY_LABELS, bmrMifflin, tdee as calcTdee, calorieGoal, defaultMacros, ageFromBirth,
} from '@/lib/nutrition'
import type { ActivityLevel, GoalType, Sex } from '@/db/types'
import { fmtKcal } from '@/lib/format'

const STEPS = ['Bienvenida', 'Tú', 'Cuerpo', 'Objetivo', 'Ritmo', 'Actividad', 'Plan']

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [name, setName] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [birthDate, setBirthDate] = useState('1995-01-01')
  const [heightCm, setHeightCm] = useState(175)
  const [weightStartKg, setWeightStartKg] = useState(75)
  const [weightGoalKg, setWeightGoalKg] = useState(70)
  const [goalType, setGoalType] = useState<GoalType>('lose')
  const [paceKgPerWeek, setPace] = useState(0.5)
  const [activityLevel, setActivity] = useState<ActivityLevel>('light')

  const age = ageFromBirth(birthDate)
  const bmr = bmrMifflin(sex, weightStartKg, heightCm, age)
  const tdee = calcTdee(bmr, activityLevel)
  const goal = goalType === 'maintain' ? tdee : calorieGoal(tdee, goalType, paceKgPerWeek, sex)
  const macros = defaultMacros(goal)

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  async function finish() {
    const input: ProfileInput = {
      name: name || 'Yo', sex, birthDate, heightCm, weightStartKg, weightGoalKg,
      goalType, paceKgPerWeek, activityLevel, units,
    }
    const profile = buildProfile(input)
    await saveProfile(profile)
    await addWeight(new Date().toISOString().slice(0, 10), weightStartKg)
  }

  const canNext = () => {
    if (step === 1) return name.trim().length > 0
    return true
  }

  return (
    <div className="screen" style={{ paddingTop: 'calc(var(--safe-t) + 20px)' }}>
      {/* Barra de progreso */}
      {step > 0 && (
        <div className="row gap-2" style={{ marginBottom: 24 }}>
          {STEPS.slice(1).map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 4,
                background: i < step ? 'var(--brand)' : 'var(--fill)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      {step === 0 && (
        <div className="col" style={{ minHeight: '70vh', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}><BrandEmblem size={84} /></div>
          <Wordmark size="lg" style={{ alignSelf: 'center', marginTop: 4 }} />
          <div style={{ width: 44, height: 1, background: 'color-mix(in srgb, var(--brand) 60%, transparent)', margin: '2px auto' }} />
          <p className="cap" style={{ letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', fontSize: 11 }}>
            Edición premium · 100% privada
          </p>
          <p className="muted" style={{ fontSize: 17, maxWidth: 340, margin: '4px auto 0' }}>
            Tu diario de calorías, macros, peso y ejercicio. Privado y 100% en tu dispositivo.
          </p>
          <div className="col gap-2" style={{ marginTop: 12 }}>
            <Feature icon="search" text="Base de datos con millones de alimentos + código de barras" />
            <Feature icon="target" text="Objetivos calculados con tu metabolismo (Mifflin-St Jeor)" />
            <Feature icon="chart" text="Progreso de peso, medidas, macros y micronutrientes" />
            <Feature icon="lock" text="Sin cuentas, sin nube: todos tus datos se quedan aquí" />
          </div>
        </div>
      )}

      {step === 1 && (
        <Step title="¿Cómo te llamas?" sub="Para personalizar tu experiencia.">
          <div className="field">
            <input className="input" placeholder="Tu nombre" value={name} autoFocus
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Sexo biológico</span>
            <Segmented value={sex} onChange={setSex} options={[
              { value: 'male', label: 'Hombre' }, { value: 'female', label: 'Mujer' },
            ]} />
            <span className="cap dim">Se usa para calcular tu metabolismo basal.</span>
          </div>
          <div className="field">
            <span className="label">Unidades</span>
            <Segmented value={units} onChange={setUnits} options={[
              { value: 'metric', label: 'Métrico (kg, cm)' }, { value: 'imperial', label: 'Imperial (lb, in)' },
            ]} />
          </div>
        </Step>
      )}

      {step === 2 && (
        <Step title="Tu cuerpo" sub="Edad y altura para el cálculo metabólico.">
          <div className="field">
            <span className="label">Fecha de nacimiento ({age} años)</span>
            <input className="input" type="date" value={birthDate} max="2015-12-31"
              onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <NumberField label="Altura" value={heightCm} unit="cm" min={120} max={230}
            onChange={setHeightCm} />
        </Step>
      )}

      {step === 3 && (
        <Step title="Peso y objetivo" sub="¿Dónde estás y a dónde quieres llegar?">
          <NumberField label="Peso actual" value={weightStartKg} unit="kg" min={35} max={250} step={0.1}
            onChange={setWeightStartKg} />
          <div className="field">
            <span className="label">¿Qué quieres hacer?</span>
            <div className="col gap-2">
              {([
                ['lose', 'Perder peso', 'flame'],
                ['maintain', 'Mantener peso', 'target'],
                ['gain', 'Ganar peso / músculo', 'dumbbell'],
              ] as [GoalType, string, 'flame'][]).map(([g, label, icon]) => (
                <button key={g} className={`list-item ${goalType === g ? '' : ''}`}
                  style={{ border: `1.5px solid ${goalType === g ? 'var(--brand)' : 'var(--hairline)'}`, borderRadius: 14, background: goalType === g ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'var(--card)' }}
                  onClick={() => setGoalType(g)}>
                  <Icon name={icon as 'flame'} size={22} color={goalType === g ? 'var(--brand)' : 'var(--text-2)'} />
                  <span className="list-item__title">{label}</span>
                  {goalType === g && <Icon name="check-circle" size={20} color="var(--brand)" style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
          </div>
          {goalType !== 'maintain' && (
            <NumberField label="Peso objetivo" value={weightGoalKg} unit="kg" min={35} max={250} step={0.1}
              onChange={setWeightGoalKg} />
          )}
        </Step>
      )}

      {step === 4 && (
        <Step title="Ritmo semanal" sub={goalType === 'gain' ? 'Cuánto quieres ganar por semana.' : 'Cuánto quieres perder por semana.'}>
          {goalType === 'maintain' ? (
            <p className="muted">Has elegido mantener tu peso. Tu objetivo serán tus calorías de mantenimiento.</p>
          ) : (
            <div className="col gap-2">
              {(goalType === 'gain' ? [0.25, 0.5] : [0.25, 0.5, 0.75, 1]).map((p) => {
                const kcal = goalType === 'gain' ? tdee + (p * 7700) / 7 : tdee - (p * 7700) / 7
                return (
                  <button key={p} className="list-item"
                    style={{ border: `1.5px solid ${paceKgPerWeek === p ? 'var(--brand)' : 'var(--hairline)'}`, borderRadius: 14, background: paceKgPerWeek === p ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'var(--card)' }}
                    onClick={() => setPace(p)}>
                    <div className="col" style={{ alignItems: 'flex-start', gap: 2 }}>
                      <span className="list-item__title">{p} kg / semana</span>
                      <span className="list-item__sub">≈ {fmtKcal(Math.round(kcal))} kcal/día {p >= 0.75 ? '· ritmo agresivo' : ''}</span>
                    </div>
                    {paceKgPerWeek === p && <Icon name="check-circle" size={20} color="var(--brand)" style={{ marginLeft: 'auto' }} />}
                  </button>
                )
              })}
              <p className="cap dim">Recomendado: 0,5 kg/semana para una pérdida sostenible.</p>
            </div>
          )}
        </Step>
      )}

      {step === 5 && (
        <Step title="Nivel de actividad" sub="Sin contar el ejercicio que registres (modo NEAT, como MyFitnessPal).">
          <div className="col gap-2">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <button key={a} className="list-item"
                style={{ border: `1.5px solid ${activityLevel === a ? 'var(--brand)' : 'var(--hairline)'}`, borderRadius: 14, background: activityLevel === a ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'var(--card)' }}
                onClick={() => setActivity(a)}>
                <span className="list-item__title" style={{ fontSize: 14 }}>{ACTIVITY_LABELS[a]}</span>
                {activityLevel === a && <Icon name="check-circle" size={20} color="var(--brand)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </Step>
      )}

      {step === 6 && (
        <Step title="Tu plan diario" sub="Calculado con la fórmula Mifflin-St Jeor.">
          <div className="card card--glow col gap-3" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span className="label">Objetivo de calorías</span>
            <div className="big-num t-cal" style={{ fontSize: 52 }}>{fmtKcal(goal)}</div>
            <span className="cap">kcal al día</span>
            <div className="row between" style={{ width: '100%', borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
              <MacroCol label="Carbos" g={macros.carbsG} pct={macros.carbsPct} color="var(--carbs)" />
              <MacroCol label="Proteína" g={macros.proteinG} pct={macros.proteinPct} color="var(--protein)" />
              <MacroCol label="Grasa" g={macros.fatG} pct={macros.fatPct} color="var(--fat)" />
            </div>
          </div>
          <div className="list" style={{ marginTop: 14 }}>
            <PlanRow label="Metabolismo basal (BMR)" value={`${fmtKcal(bmr)} kcal`} />
            <PlanRow label="Gasto total (TDEE)" value={`${fmtKcal(tdee)} kcal`} />
            <PlanRow label="Ajuste por objetivo" value={`${goal - tdee >= 0 ? '+' : ''}${fmtKcal(goal - tdee)} kcal`} />
          </div>
          <p className="cap dim" style={{ marginTop: 12, textAlign: 'center' }}>
            Podrás ajustar calorías, macros y micronutrientes cuando quieras.
          </p>
        </Step>
      )}

      {/* Botones */}
      <div className="col gap-2" style={{ marginTop: 28 }}>
        {step === STEPS.length - 1 ? (
          <button className="btn btn--grad btn--full" onClick={finish}>
            Empezar a usar NutriPiki
          </button>
        ) : (
          <button className="btn btn--primary btn--full" onClick={next} disabled={!canNext()}>
            {step === 0 ? 'Comenzar' : 'Continuar'}
          </button>
        )}
        {step > 0 && (
          <button className="btn btn--ghost btn--full" onClick={back}>Atrás</button>
        )}
      </div>
    </div>
  )
}

function Step({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="col gap-4">
      <div>
        <h1 className="h1" style={{ marginBottom: 6 }}>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Feature({ icon, text }: { icon: 'search' | 'target' | 'chart' | 'lock'; text: string }) {
  return (
    <div className="row gap-3" style={{ textAlign: 'left' }}>
      <div className="center-all" style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--fill)', flexShrink: 0 }}>
        <Icon name={icon} size={20} color="var(--brand)" />
      </div>
      <span className="cap" style={{ fontSize: 14 }}>{text}</span>
    </div>
  )
}

function NumberField({ label, value, unit, onChange, min, max, step = 1 }: {
  label: string; value: number; unit: string; onChange: (v: number) => void; min: number; max: number; step?: number
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="input-suffix">
        <input className="input" type="number" inputMode="decimal" value={value}
          min={min} max={max} step={step} onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        <span>{unit}</span>
      </div>
    </div>
  )
}

function MacroCol({ label, g, pct, color }: { label: string; g: number; pct: number; color: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 2 }}>
      <span className="big-num" style={{ fontSize: 20, color }}>{g}g</span>
      <span className="label" style={{ margin: 0 }}>{label}</span>
      <span className="cap dim">{pct}%</span>
    </div>
  )
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-item">
      <span className="list-item__title" style={{ fontWeight: 500 }}>{label}</span>
      <span className="list-item__trail tabnum" style={{ fontWeight: 700 }}>{value}</span>
    </div>
  )
}
