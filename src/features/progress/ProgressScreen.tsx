import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { ListRow } from '@/components/ui'
import { BarChart, LineChart, type Point } from '@/components/Charts'
import { WeekCaloriesCard } from '@/components/WeekCaloriesCard'
import { useProfile, useWeights, useAllLoggedDates, useWeekDays } from '@/hooks/useData'
import { latestWeight, loggingStreak, weekCalories } from '@/lib/selectors'
import { kgToDisplay, weightUnit } from '@/lib/units'
import { fmtKcal, fmtNum, fmtSigned } from '@/lib/format'
import { todayKey, parseKey, weekRange } from '@/lib/date'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ProgressScreen() {
  const nav = useNavigate()
  const profile = useProfile()
  const weights = useWeights() ?? []
  const logged = useAllLoggedDates() ?? new Set<string>()

  const today = todayKey()
  const week = weekRange(today, profile?.weeklyStartsMonday ?? true)
  const weekDays = useWeekDays(week) ?? []

  if (!profile) return null
  const u = profile.units
  const current = latestWeight(weights, profile.weightStartKg)
  const changed = current - profile.weightStartKg
  const streak = loggingStreak(logged, today)

  const wk = weekCalories(profile, weekDays, today)
  const loggedDays = weekDays.filter((d) => d.eatenKcal > 0).length
  const dailyGoal = weekDays.length ? Math.round(wk.budget / weekDays.length) : profile.calorieGoal

  const barData: Point[] = weekDays.map((d) => ({
    label: format(parseKey(d.date), 'EEEEE', { locale: es }),
    value: d.eatenKcal,
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

      {/* Calorías de la semana (mismos números que el Plan semanal) */}
      <WeekCaloriesCard
        wk={wk}
        units={u}
        title="Calorías de la semana"
        action={<button className="cap t-cal" style={{ fontWeight: 700 }} onClick={() => nav('/planner')}>Plan semanal ›</button>}
      >
        <div className="col gap-1" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
          <div className="row between">
            <span className="cap dim">Día a día · objetivo {fmtKcal(dailyGoal)} kcal</span>
            <span className="cap dim tabnum">{loggedDays}/{weekDays.length || 7} días registrados</span>
          </div>
          {barData.length > 0 && <BarChart data={barData} goal={dailyGoal} height={140} color="var(--brand)" />}
        </div>
      </WeekCaloriesCard>

      <div className="section-title">Seguimiento corporal</div>
      <div className="list">
        <ListRow icon="scale" iconColor="var(--protein)" title="Peso" sub="Tendencia e historial" onClick={() => nav('/weight')} />
        <ListRow icon="ruler" iconColor="var(--carbs)" title="Medidas" sub="Cintura, cadera, % grasa…" onClick={() => nav('/measurements')} />
        <ListRow icon="camera" iconColor="var(--brand)" title="Fotos de progreso" sub="Compara tu evolución" onClick={() => nav('/photos')} />
      </div>

      <div className="section-title">Social</div>
      <div className="list">
        <ListRow icon="users" iconColor="var(--brand)" title="Amigos" sub="Compara tu constancia con la suya" onClick={() => nav('/friends')} />
      </div>

      <div className="section-title">Análisis</div>
      <div className="list">
        <ListRow icon="trophy" iconColor="var(--brand)" title="Análisis y gasto real" sub="TDEE adaptativo, racha y consejos" onClick={() => nav('/insights')} />
        <ListRow icon="chart" iconColor="var(--brand)" title="Reportes" sub="Calorías y macros en el tiempo" onClick={() => nav('/reports')} />
        <ListRow icon="target" iconColor="var(--brand-2)" title="Panel de nutrientes" sub="Macros y micronutrientes de hoy" onClick={() => nav('/nutrition')} />
      </div>
    </div>
  )
}
