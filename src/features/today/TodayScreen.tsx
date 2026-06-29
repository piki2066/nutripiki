import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Wordmark } from '@/components/Wordmark'
import { Ring } from '@/components/Ring'
import { MacroBar } from '@/components/ui'
import {
  useProfile, useDayEntries, useDayExercise, useDayWater, useDaySteps,
  useWeights, useAllLoggedDates,
} from '@/hooks/useData'
import { dayTotals, exerciseCalories, calorieSummary, loggingStreak, latestWeight } from '@/lib/selectors'
import { todayKey } from '@/lib/date'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'
import { kgToDisplay, weightUnit } from '@/lib/units'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function TodayScreen() {
  const nav = useNavigate()
  const today = todayKey()
  const profile = useProfile()
  const entries = useDayEntries(today) ?? []
  const exercise = useDayExercise(today) ?? []
  const water = useDayWater(today) ?? []
  const steps = useDaySteps(today)
  const weights = useWeights() ?? []
  const loggedDates = useAllLoggedDates() ?? new Set<string>()
  const setQuickOpen = useUI((s) => s.setQuickOpen)

  if (!profile) return null

  const totals = dayTotals(entries)
  const exKcal = exerciseCalories(exercise, steps?.caloriesBurned ?? 0)
  const sum = calorieSummary(profile, today, totals, exKcal)
  const streak = loggingStreak(loggedDates, today)
  const waterMl = water.reduce((s, w) => s + w.amountMl, 0)
  const curWeight = latestWeight(weights, profile.weightStartKg)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 6) return 'Buenas noches'
    if (h < 14) return 'Buenos días'
    if (h < 21) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const remaining = sum.remaining
  const over = remaining < 0

  return (
    <div className="screen">
      <AppHeader
        center={<div className="row center" style={{ flex: 1 }}>
          <Wordmark size="sm" />
        </div>}
        trailing={
          streak > 0 ? (
            <div className="badge badge--brand" style={{ background: 'color-mix(in srgb, var(--warn) 18%, transparent)', color: 'var(--warn)' }}>
              <Icon name="flame" size={15} fill color="var(--warn)" /> {streak}
            </div>
          ) : undefined
        }
      />

      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="h1">{greeting}{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}</div>
          <div className="muted" style={{ textTransform: 'capitalize' }}>{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</div>
        </div>
      </div>

      {/* Tarjeta principal de calorías */}
      <div className="card card--glow" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div className="col gap-2">
            <div className="row gap-3">
              <CalStat label="Objetivo" value={fmtKcal(sum.goal)} />
              <span className="dim" style={{ fontSize: 22, alignSelf: 'center' }}>−</span>
              <CalStat label="Comida" value={fmtKcal(sum.food)} color="var(--carbs)" />
              <span className="dim" style={{ fontSize: 22, alignSelf: 'center' }}>+</span>
              <CalStat label="Ejercicio" value={fmtKcal(sum.exercise)} color="var(--brand-2)" />
            </div>
          </div>
        </div>
        <div className="row center" style={{ margin: '8px 0 4px' }}>
          <Ring value={sum.food} goal={sum.goal + sum.exercise} size={180} thickness={16}
            color={over ? 'var(--bad)' : 'var(--brand)'}>
            <div className="big-num" style={{ fontSize: 44, color: over ? 'var(--bad)' : 'var(--text)' }}>{fmtKcal(Math.abs(remaining))}</div>
            <div className="label" style={{ margin: 0 }}>{over ? 'kcal de más' : 'kcal restantes'}</div>
          </Ring>
        </div>
      </div>

      {/* Macros */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <span className="h3">Macronutrientes</span>
          <button className="cap t-cal" style={{ fontWeight: 700 }} onClick={() => nav('/nutrition')}>Ver todo ›</button>
        </div>
        <div className="col gap-4">
          <MacroLine label="Carbohidratos" value={totals.carbs} goal={profile.macros.carbsG} color="var(--carbs)" />
          <MacroLine label="Proteínas" value={totals.protein} goal={profile.macros.proteinG} color="var(--protein)" />
          <MacroLine label="Grasas" value={totals.fat} goal={profile.macros.fatG} color="var(--fat)" />
        </div>
      </div>

      {/* Tarjetas rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <QuickCard icon="water" color="var(--brand)" title="Agua" value={`${fmtNum(waterMl / 1000)} L`}
          sub={`Meta ${fmtNum(profile.waterGoalMl / 1000)} L`} onClick={() => nav('/diary')} progress={waterMl / profile.waterGoalMl} />
        <QuickCard icon="dumbbell" color="var(--brand-2)" title="Ejercicio" value={`${fmtKcal(exKcal)} kcal`}
          sub={exercise.length ? `${exercise.length} actividades` : 'Sin registrar'} onClick={() => nav('/exercise')} />
        <QuickCard icon="steps" color="var(--carbs)" title="Pasos" value={fmtKcal(steps?.steps ?? 0)}
          sub={`Meta ${fmtKcal(profile.stepGoal)}`} onClick={() => nav('/exercise')} progress={(steps?.steps ?? 0) / profile.stepGoal} />
        <QuickCard icon="scale" color="var(--protein)" title="Peso" value={`${fmtNum(kgToDisplay(curWeight, profile.units))} ${weightUnit(profile.units)}`}
          sub={`Meta ${fmtNum(kgToDisplay(profile.weightGoalKg, profile.units))} ${weightUnit(profile.units)}`} onClick={() => nav('/weight')} />
      </div>

      <div className="row gap-2" style={{ marginTop: 16 }}>
        <button className="btn btn--soft grow" onClick={() => nav('/diary')}>
          <Icon name="diary" size={20} /> Diario
        </button>
        <button className="btn btn--soft grow" onClick={() => nav('/planner')}>
          <Icon name="calendar" size={20} /> Plan semanal
        </button>
      </div>

      <button className="fab" onClick={() => setQuickOpen(true)} aria-label="Añadir">
        <Icon name="plus" size={28} strokeWidth={2.6} />
      </button>
    </div>
  )
}

function CalStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="col" style={{ gap: 1 }}>
      <span className="big-num" style={{ fontSize: 19, color }}>{value}</span>
      <span className="label" style={{ margin: 0 }}>{label}</span>
    </div>
  )
}

function MacroLine({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div className="col gap-1">
      <div className="row between">
        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
        <span className="cap tabnum"><b style={{ color }}>{fmtNum(value)}</b> / {goal} g</span>
      </div>
      <MacroBar value={value} goal={goal} color={color} />
    </div>
  )
}

function QuickCard({ icon, color, title, value, sub, onClick, progress }: {
  icon: 'water' | 'dumbbell' | 'steps' | 'scale'; color: string; title: string; value: string; sub: string; onClick: () => void; progress?: number
}) {
  return (
    <button className="card card--tap col gap-2" onClick={onClick} style={{ alignItems: 'flex-start', textAlign: 'left' }}>
      <div className="row between" style={{ width: '100%' }}>
        <div className="center-all" style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
          <Icon name={icon} size={20} color={color} />
        </div>
        <Icon name="chevron-right" size={18} color="var(--text-3)" />
      </div>
      <div>
        <div className="big-num" style={{ fontSize: 22 }}>{value}</div>
        <div className="label" style={{ margin: '2px 0 0' }}>{title}</div>
        <div className="cap dim">{sub}</div>
      </div>
      {progress != null && (
        <div className="macro-bar" style={{ width: '100%' }}><span style={{ width: `${Math.min(100, progress * 100)}%`, background: color }} /></div>
      )}
    </button>
  )
}
