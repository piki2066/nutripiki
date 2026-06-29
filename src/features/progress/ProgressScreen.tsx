import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { ListRow, Stat } from '@/components/ui'
import { BarChart, LineChart, type Point } from '@/components/Charts'
import { db } from '@/db/db'
import { useProfile, useWeights, useAllLoggedDates } from '@/hooks/useData'
import { latestWeight, loggingStreak, effectiveCalorieGoal } from '@/lib/selectors'
import { sumNutrients } from '@/lib/nutrition'
import { kgToDisplay, weightUnit } from '@/lib/units'
import { fmtKcal, fmtNum, fmtSigned } from '@/lib/format'
import { lastNDays, todayKey, parseKey } from '@/lib/date'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ProgressScreen() {
  const nav = useNavigate()
  const profile = useProfile()
  const weights = useWeights() ?? []
  const logged = useAllLoggedDates() ?? new Set<string>()

  const days = lastNDays(7)
  const weekData = useLiveQuery(async () => {
    const out: { date: string; calories: number }[] = []
    for (const d of days) {
      const entries = await db.foodEntries.where('date').equals(d).toArray()
      out.push({ date: d, calories: sumNutrients(entries.map((e) => e.nutrients)).calories })
    }
    return out
  }, [days.join(',')], [])

  if (!profile) return null
  const u = profile.units
  const current = latestWeight(weights, profile.weightStartKg)
  const changed = current - profile.weightStartKg
  const streak = loggingStreak(logged, todayKey())

  const loggedDays = (weekData ?? []).filter((d) => d.calories > 0)
  const avgCal = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length) : 0
  const goal = effectiveCalorieGoal(profile, todayKey())

  const barData: Point[] = (weekData ?? []).map((d) => ({
    label: format(parseKey(d.date), 'EEEEE', { locale: es }),
    value: Math.round(d.calories),
  }))

  const weightPoints: Point[] = [...weights]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-30)
    .map((w) => ({ label: format(parseKey(w.date), 'd/M', { locale: es }), value: kgToDisplay(w.weightKg, u) }))

  return (
    <div className="screen">
      <AppHeader title="Progreso" trailing={streak > 0 ? <div className="badge" style={{ background: 'color-mix(in srgb, var(--warn) 18%, transparent)', color: 'var(--warn)' }}><Icon name="flame" size={14} fill color="var(--warn)" /> {streak} días</div> : undefined} />

      {/* Peso */}
      <button className="card card--glow col gap-3" style={{ width: '100%', marginBottom: 14, textAlign: 'left' }} onClick={() => nav('/weight')}>
        <div className="row between">
          <span className="h3">Peso</span>
          <Icon name="chevron-right" size={20} color="var(--text-3)" />
        </div>
        <div className="row between">
          <div className="col" style={{ gap: 2 }}>
            <div className="big-num" style={{ fontSize: 32 }}>{fmtNum(kgToDisplay(current, u))} <span className="muted" style={{ fontSize: 16 }}>{weightUnit(u)}</span></div>
            <span className="cap dim">Meta {fmtNum(kgToDisplay(profile.weightGoalKg, u))} {weightUnit(u)}</span>
          </div>
          <span className="badge" style={{ background: changed <= 0 ? 'color-mix(in srgb, var(--good) 18%, transparent)' : 'color-mix(in srgb, var(--warn) 18%, transparent)', color: changed <= 0 ? 'var(--good)' : 'var(--warn)' }}>
            {fmtSigned(kgToDisplay(changed, u))} {weightUnit(u)}
          </span>
        </div>
        {weightPoints.length >= 2 && <LineChart data={weightPoints} goal={kgToDisplay(profile.weightGoalKg, u)} height={130} />}
      </button>

      {/* Esta semana */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="h3">Esta semana</span>
          <button className="cap t-cal" style={{ fontWeight: 700 }} onClick={() => nav('/reports')}>Reportes ›</button>
        </div>
        <div className="row between" style={{ marginBottom: 14 }}>
          <Stat label="Media kcal" value={fmtKcal(avgCal)} accent="var(--cal)" />
          <Stat label="Días reg." value={`${loggedDays.length}/7`} accent="var(--brand-2)" />
          <Stat label="Objetivo" value={fmtKcal(goal)} />
        </div>
        <BarChart data={barData} goal={goal} height={150} color="var(--brand)" />
      </div>

      <div className="section-title">Seguimiento corporal</div>
      <div className="list">
        <ListRow icon="scale" iconColor="var(--protein)" title="Peso" sub="Tendencia e historial" onClick={() => nav('/weight')} />
        <ListRow icon="ruler" iconColor="var(--carbs)" title="Medidas" sub="Cintura, cadera, % grasa…" onClick={() => nav('/measurements')} />
        <ListRow icon="camera" iconColor="var(--brand)" title="Fotos de progreso" sub="Compara tu evolución" onClick={() => nav('/photos')} />
      </div>

      <div className="section-title">Análisis</div>
      <div className="list">
        <ListRow icon="chart" iconColor="var(--brand)" title="Reportes" sub="Calorías y macros en el tiempo" onClick={() => nav('/reports')} />
        <ListRow icon="target" iconColor="var(--brand-2)" title="Panel de nutrientes" sub="Macros y micronutrientes de hoy" onClick={() => nav('/nutrition')} />
      </div>
    </div>
  )
}
