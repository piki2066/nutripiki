import { useLiveQuery } from 'dexie-react-hooks'
import { AppHeader } from '@/components/AppHeader'
import { Icon, type IconName } from '@/components/Icon'
import { Stat } from '@/components/ui'
import { ConsistencyHeatmap } from '@/components/ConsistencyHeatmap'
import { db } from '@/db/db'
import { useProfile, useWeights, useAllLoggedDates } from '@/hooks/useData'
import {
  sumNutrients, defaultMicros, macrosFromPercent, calorieGoal as calcGoal,
} from '@/lib/nutrition'
import { effectiveCalorieGoal, loggingStreak } from '@/lib/selectors'
import { adaptiveMaintenance, weightTrend, trendRatePerWeek } from '@/lib/analytics'
import { patchProfile } from '@/db/repo'
import { lastNDays, todayKey } from '@/lib/date'
import { fmtKcal, fmtSigned } from '@/lib/format'
import { kgToDisplay, weightUnit } from '@/lib/units'
import { useUI } from '@/lib/store'

interface Tip { icon: IconName; text: string; color: string }

export default function InsightsScreen() {
  const profile = useProfile()
  const weights = useWeights() ?? []
  const logged = useAllLoggedDates() ?? new Set<string>()
  const toast = useUI((s) => s.toast)

  const days30 = lastNDays(30)
  const intake = useLiveQuery(async () => {
    const out: { date: string; calories: number; protein: number }[] = []
    for (const d of days30) {
      const e = await db.foodEntries.where('date').equals(d).toArray()
      const t = sumNutrients(e.map((x) => x.nutrients))
      out.push({ date: d, calories: Math.round(t.calories), protein: Math.round(t.protein) })
    }
    return out
  }, [days30.join(',')], [])

  if (!profile) return null
  const u = profile.units
  const goal = effectiveCalorieGoal(profile, todayKey())
  const proteinGoal = profile.macros.proteinG

  const last7 = (intake ?? []).slice(-7)
  const logged7 = last7.filter((d) => d.calories > 0)
  const avgCal7 = logged7.length ? Math.round(logged7.reduce((s, d) => s + d.calories, 0) / logged7.length) : 0
  const avgProt7 = logged7.length ? Math.round(logged7.reduce((s, d) => s + d.protein, 0) / logged7.length) : 0
  const proteinDays = logged7.filter((d) => d.protein >= proteinGoal).length
  const onTargetDays = logged7.filter((d) => d.calories <= goal + 50).length
  const streak = loggingStreak(logged, todayKey())

  const maint = adaptiveMaintenance(intake ?? [], weights)
  const rate = trendRatePerWeek(weightTrend(weights))

  async function applyMaintenance() {
    if (!maint || !profile) return
    const newGoal = profile.goalType === 'maintain'
      ? maint.kcal
      : calcGoal(maint.kcal, profile.goalType, profile.paceKgPerWeek, profile.sex)
    const m = profile.macros
    const macros = macrosFromPercent(newGoal, m.carbsPct, m.proteinPct, m.fatPct)
    await patchProfile({ calorieGoal: newGoal, tdee: maint.kcal, macros, micros: defaultMicros(newGoal), manualCalories: false })
    toast('Objetivo ajustado a tu gasto real', { icon: 'check' })
  }

  // ---- Consejos (motor de reglas local, sin IA) ----
  const tips: Tip[] = []
  if (logged7.length < 3) tips.push({ icon: 'info', text: 'Registra unos días más para análisis más fiables.', color: 'var(--text-2)' })
  if (logged7.length >= 3 && avgProt7 < proteinGoal * 0.85) tips.push({ icon: 'apple', text: `Vas corto de proteína: media ${avgProt7} g vs objetivo ${proteinGoal} g.`, color: 'var(--protein)' })
  if (maint && goal < maint.kcal - 900) tips.push({ icon: 'flame', text: 'Tu déficit es bastante agresivo. Asegúrate de comer suficiente proteína y descansar.', color: 'var(--warn)' })
  if (maint && Math.abs(maint.kcal - profile.tdee) > 250) tips.push({ icon: 'target', text: `Tu gasto real estimado (${fmtKcal(maint.kcal)}) difiere de tu estimación (${fmtKcal(profile.tdee)}). Considera ajustarlo.`, color: 'var(--brand)' })
  if (rate != null && profile.goalType === 'lose' && rate > -0.05 && logged7.length >= 4) tips.push({ icon: 'chart', text: 'Tu peso lleva plano. Si quieres seguir bajando, baja un poco las calorías o muévete más.', color: 'var(--warn)' })
  if (streak >= 7) tips.push({ icon: 'flame', text: `¡Racha de ${streak} días! La constancia es lo que más importa.`, color: 'var(--brand)' })
  if (!tips.length) tips.push({ icon: 'check-circle', text: 'Vas muy bien. Sigue registrando con constancia.', color: 'var(--good)' })

  return (
    <div className="screen">
      <AppHeader back title="Análisis" />

      {/* Resumen 7 días */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="h3">Últimos 7 días</span>
          <div className="badge badge--soft" style={{ color: 'var(--brand)' }}><Icon name="flame" size={14} fill color="var(--brand)" /> {streak} días</div>
        </div>
        <div className="row between">
          <Stat label="Media kcal" value={fmtKcal(avgCal7)} accent="var(--cal)" />
          <Stat label="Proteína" value={`${proteinDays}/${logged7.length || 0}`} accent="var(--protein)" />
          <Stat label="En objetivo" value={`${onTargetDays}/${logged7.length || 0}`} accent="var(--good)" />
        </div>
      </div>

      {/* TDEE adaptativo */}
      <div className="card col gap-3" style={{ marginBottom: 14 }}>
        <div className="row between">
          <span className="h3">Gasto real (adaptativo)</span>
          <Icon name="target" size={18} color="var(--brand)" />
        </div>
        {maint ? (
          <>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="col" style={{ gap: 2 }}>
                <span className="big-num t-cal" style={{ fontSize: 34 }}>{fmtKcal(maint.kcal)}</span>
                <span className="cap dim">kcal/día de mantenimiento</span>
              </div>
              <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
                <span className="cap dim">tu estimación</span>
                <span className="tabnum" style={{ fontWeight: 700 }}>{fmtKcal(profile.tdee)}</span>
              </div>
            </div>
            <p className="cap dim">Calculado con tu ingesta y tu tendencia de peso de los últimos {maint.spanDays} días ({maint.loggedDays} registrados).</p>
            <button className="btn btn--grad btn--full" onClick={applyMaintenance}>Usar como mi objetivo</button>
          </>
        ) : (
          <p className="cap dim">Registra comidas y tu peso durante 1-2 semanas y aquí verás tu gasto calórico real, calculado a partir de tus datos.</p>
        )}
      </div>

      {/* Tendencia de peso */}
      {rate != null && (
        <div className="card row between" style={{ marginBottom: 14, alignItems: 'center' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="scale" size={20} color="var(--protein)" />
            <span className="h3">Tendencia de peso</span>
          </div>
          <span className="big-num" style={{ fontSize: 20, color: rate <= 0 ? 'var(--good)' : 'var(--warn)' }}>
            {fmtSigned(kgToDisplay(rate, u))} <span className="muted" style={{ fontSize: 12 }}>{weightUnit(u)}/sem</span>
          </span>
        </div>
      )}

      {/* Constancia */}
      <div className="card col gap-3" style={{ marginBottom: 14 }}>
        <div className="row between">
          <span className="h3">Constancia</span>
          <span className="cap dim">16 semanas</span>
        </div>
        <ConsistencyHeatmap logged={logged} weeks={16} />
      </div>

      {/* Consejos */}
      <div className="section-title">Consejos</div>
      <div className="list">
        {tips.map((t, i) => (
          <div key={i} className="list-item" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: t.color, display: 'flex', marginTop: 1 }}><Icon name={t.icon} size={20} /></span>
            <span className="list-item__title" style={{ fontWeight: 500, whiteSpace: 'normal' }}>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
