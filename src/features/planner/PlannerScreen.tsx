import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { db } from '@/db/db'
import type { FoodEntry } from '@/db/types'
import { useProfile } from '@/hooks/useData'
import { sumNutrients } from '@/lib/nutrition'
import { exerciseCalories, effectiveCalorieGoal, isEaten } from '@/lib/selectors'
import { copyWeekPlan, clearDayPlan, setEntryDone, deleteEntry } from '@/db/repo'
import { weekRange, shiftKey, todayKey, parseKey } from '@/lib/date'
import { fmtKcal, fmtNum } from '@/lib/format'
import { kgToDisplay, weightUnit } from '@/lib/units'
import { useUI } from '@/lib/store'

interface DayPlan { date: string; items: FoodEntry[]; planKcal: number; eatenKcal: number; exKcal: number; hasEx: boolean }

export default function PlannerScreen() {
  const nav = useNavigate()
  const profile = useProfile()
  const toast = useUI((s) => s.toast)
  const setCurrentDate = useUI((s) => s.setCurrentDate)
  const [anchor, setAnchor] = useState(todayKey())
  const [expanded, setExpanded] = useState<string | null>(todayKey())

  const startsMonday = profile?.weeklyStartsMonday ?? true
  const week = weekRange(anchor, startsMonday)

  const data = useLiveQuery(async () => {
    const out: DayPlan[] = []
    for (const d of week) {
      const items = await db.foodEntries.where('date').equals(d).toArray()
      const ex = await db.exerciseEntries.where('date').equals(d).toArray()
      const stp = await db.steps.get(d)
      out.push({
        date: d,
        items: items.sort((a, b) => a.createdAt - b.createdAt),
        planKcal: Math.round(sumNutrients(items.map((x) => x.nutrients)).calories),
        eatenKcal: Math.round(sumNutrients(items.filter(isEaten).map((x) => x.nutrients)).calories),
        exKcal: exerciseCalories(ex, stp?.caloriesBurned ?? 0),
        hasEx: ex.length > 0,
      })
    }
    return out
  }, [week.join(',')], [])

  if (!profile) return null
  const u = profile.units
  const days: DayPlan[] = data ?? week.map((d) => ({ date: d, items: [], planKcal: 0, eatenKcal: 0, exKcal: 0, hasEx: false }))
  const dayBudget = (d: DayPlan) => effectiveCalorieGoal(profile, d.date) + d.exKcal

  const plannedDays = days.filter((d) => d.planKcal > 0)
  const avgPlan = plannedDays.length ? Math.round(plannedDays.reduce((s, d) => s + d.planKcal, 0) / plannedDays.length) : 0
  const daysOk = plannedDays.filter((d) => d.planKcal <= dayBudget(d)).length
  const weeklyKg = plannedDays.length ? ((avgPlan - profile.tdee) * 7) / 7700 : 0
  const trend = weeklyKg <= -0.05 ? 'down' : weeklyKg >= 0.05 ? 'up' : 'flat'

  const kgTxt = `${fmtNum(kgToDisplay(Math.abs(weeklyKg), u))} ${weightUnit(u)}/sem`
  const trajText = trend === 'down' ? `Si cumples el plan, bajarías ~${kgTxt}`
    : trend === 'up' ? `Si cumples el plan, subirías ~${kgTxt}`
      : 'Si cumples el plan, mantendrías el peso'
  const aligned = (profile.goalType === 'lose' && trend === 'down')
    || (profile.goalType === 'gain' && trend === 'up')
    || (profile.goalType === 'maintain' && trend === 'flat')
  const advice = aligned ? 'Vas bien para tu objetivo.'
    : profile.goalType === 'lose' ? 'Para bajar, planifica algo menos o añade deporte.'
      : profile.goalType === 'gain' ? 'Para ganar, planifica un poco más.'
        : 'Para mantener, ajusta algo las calorías.'

  const rangeLabel = `${format(parseKey(week[0]), 'd MMM', { locale: es })} – ${format(parseKey(week[6]), 'd MMM', { locale: es })}`
  const isThisWeek = week.includes(todayKey())

  async function duplicateNext() {
    const next = weekRange(shiftKey(anchor, 7), startsMonday)
    const n = await copyWeekPlan(week, next)
    toast(n ? `Semana duplicada (${n} registros)` : 'No hay nada que duplicar', { icon: n ? 'check' : 'info' })
    if (n) setAnchor(shiftKey(anchor, 7))
  }

  return (
    <div className="screen">
      <AppHeader back title="Plan semanal"
        trailing={<button className="icon-btn" onClick={duplicateNext} aria-label="Duplicar a la semana siguiente"><Icon name="copy" size={20} /></button>} />

      {/* Navegación de semana */}
      <div className="row center gap-2" style={{ marginBottom: 14 }}>
        <button className="icon-btn" onClick={() => setAnchor(shiftKey(anchor, -7))} aria-label="Semana anterior"><Icon name="chevron-left" size={22} /></button>
        <span className="cap" style={{ fontWeight: 750, minWidth: 150, textAlign: 'center' }}>{isThisWeek ? 'Esta semana' : rangeLabel}</span>
        <button className="icon-btn" onClick={() => setAnchor(shiftKey(anchor, 7))} aria-label="Semana siguiente"><Icon name="chevron-right" size={22} /></button>
      </div>

      {/* Resumen + feedback */}
      <div className="card card--glow col gap-3" style={{ marginBottom: 14 }}>
        <div className="row between">
          <div className="col" style={{ gap: 2 }}>
            <span className="label" style={{ margin: 0 }}>Media del plan</span>
            <span className="big-num t-cal" style={{ fontSize: 30 }}>{fmtKcal(avgPlan)} <span className="muted" style={{ fontSize: 13 }}>kcal/día</span></span>
          </div>
          <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
            <span className="label" style={{ margin: 0 }}>Cumple objetivo</span>
            <span className="big-num" style={{ fontSize: 22, color: 'var(--good)' }}>{daysOk}/{plannedDays.length || 0}<span className="muted" style={{ fontSize: 13 }}> días</span></span>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
          <Icon name={aligned ? 'check-circle' : 'info'} size={18} color={aligned ? 'var(--good)' : 'var(--warn)'} style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="cap">
            {plannedDays.length ? <><b>{trajText}.</b> {advice}</> : 'Añade comidas a cada día para montar tu plan y ver si cumples tu objetivo.'}
          </span>
        </div>
      </div>

      {/* Días */}
      <div className="col gap-2">
        {days.map((d) => {
          const budget = dayBudget(d)
          const planOver = d.planKcal > budget
          const has = d.planKcal > 0
          const pct = budget > 0 ? Math.min(100, (d.eatenKcal / budget) * 100) : 0
          const planPct = budget > 0 ? Math.min(100, (d.planKcal / budget) * 100) : 0
          const isToday = d.date === todayKey()
          const open = expanded === d.date
          return (
            <div key={d.date} className="card col gap-2" style={{ padding: 12, border: isToday ? '1px solid color-mix(in srgb, var(--brand) 50%, transparent)' : '1px solid transparent' }}>
              <button className="row between" style={{ alignItems: 'center', background: 'none', width: '100%' }} onClick={() => setExpanded(open ? null : d.date)}>
                <div className="col" style={{ alignItems: 'flex-start', gap: 1 }}>
                  <span className="h3" style={{ textTransform: 'capitalize' }}>{format(parseKey(d.date), 'EEEE', { locale: es })}{isToday ? ' · hoy' : ''}</span>
                  <span className="cap dim">{format(parseKey(d.date), "d 'de' MMM", { locale: es })} · {d.items.length} alimentos</span>
                </div>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <div className="col" style={{ alignItems: 'flex-end', gap: 1 }}>
                    <span className="tabnum" style={{ fontWeight: 800, fontSize: 16, color: !has ? 'var(--text-3)' : 'var(--text)' }}>
                      {fmtKcal(d.eatenKcal)} <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>/ {fmtKcal(d.planKcal)}</span>
                    </span>
                    <span className="cap dim tabnum">plan · obj. {fmtKcal(budget)}</span>
                  </div>
                  <Icon name={open ? 'chevron-down' : 'chevron-right'} size={18} color="var(--text-3)" />
                </div>
              </button>

              {/* Barra: comido (sólido) sobre plan (tenue) */}
              <div className="macro-bar" style={{ position: 'relative' }}>
                <span style={{ width: `${planPct}%`, background: planOver ? 'color-mix(in srgb, var(--bad) 35%, transparent)' : 'var(--fill-2)', position: 'absolute', inset: 0, borderRadius: 999 }} />
                <span style={{ width: `${pct}%`, background: 'var(--brand)' }} />
              </div>

              <div className="row between" style={{ alignItems: 'center' }}>
                <span className="cap" style={{ color: d.hasEx ? 'var(--brand-2)' : 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="dumbbell" size={13} color={d.hasEx ? 'var(--brand-2)' : 'var(--text-3)'} />
                  {d.hasEx ? `Deporte · +${fmtKcal(d.exKcal)} kcal` : 'Descanso'}
                </span>
                <span className="cap" style={{ fontWeight: 700, color: !has ? 'var(--text-3)' : planOver ? 'var(--bad)' : 'var(--good)' }}>
                  {!has ? 'Sin plan' : planOver ? `Plan se pasa ${fmtKcal(d.planKcal - budget)}` : `Plan cumple · ${fmtKcal(budget - d.planKcal)} libre`}
                </span>
              </div>

              {/* Checklist al expandir */}
              {open && (
                <div className="col gap-1" style={{ marginTop: 4 }}>
                  {d.items.length > 0 && <div className="divider" />}
                  {d.items.map((it) => {
                    const eaten = isEaten(it)
                    return (
                      <div key={it.id} className="row gap-2" style={{ alignItems: 'center', padding: '4px 0' }}>
                        <button className="center-all" onClick={() => setEntryDone(it.id, !eaten)} aria-label={eaten ? 'Marcar como pendiente' : 'Marcar como comido'}
                          style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: eaten ? 'var(--brand)' : 'var(--fill)', color: eaten ? '#fff' : 'var(--text-3)', border: eaten ? 'none' : '1px solid var(--hairline-strong)' }}>
                          <Icon name="check" size={16} color={eaten ? '#fff' : 'var(--text-3)'} />
                        </button>
                        <div className="col" style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 0, opacity: eaten ? 1 : 0.7 }}>
                          <span className="list-item__title ellipsis" style={{ fontSize: 14, textDecoration: eaten ? 'none' : 'none' }}>{it.name}</span>
                          <span className="cap dim ellipsis">{it.quantity !== 1 ? `${fmtNum(it.quantity)} × ` : ''}{it.servingLabel}{!eaten ? ' · planificado' : ''}</span>
                        </div>
                        <span className="tabnum" style={{ fontWeight: 700, fontSize: 13 }}>{fmtKcal(it.nutrients.calories)}</span>
                        <button className="icon-btn" onClick={() => deleteEntry(it.id)} aria-label="Quitar"><Icon name="trash" size={15} color="var(--text-3)" /></button>
                      </div>
                    )
                  })}
                  {d.items.length === 0 && <span className="cap dim" style={{ padding: '4px 0' }}>Sin alimentos. Añade los que planeas comer.</span>}
                  {d.items.length > 0 && <p className="cap dim" style={{ fontSize: 11, marginTop: 2 }}>Marca cada alimento cuando te lo comas: las calorías comidas suben en tiempo real.</p>}

                  <div className="row gap-2" style={{ marginTop: 6 }}>
                    <button className="btn btn--soft btn--sm grow" onClick={() => nav(`/add?date=${d.date}&meal=breakfast&plan=1`)}><Icon name="plus" size={15} /> Planear comida</button>
                    <button className="btn btn--soft btn--sm grow" onClick={() => { setCurrentDate(d.date); nav('/exercise') }}><Icon name="dumbbell" size={15} /> Deporte</button>
                    <button className="btn btn--soft btn--sm grow" onClick={() => { setCurrentDate(d.date); nav('/diary') }}><Icon name="diary" size={15} /> Diario</button>
                    {has && <button className="btn btn--soft btn--sm" onClick={() => { clearDayPlan(d.date); toast('Día vaciado', { icon: 'info' }) }} aria-label="Vaciar día"><Icon name="trash" size={15} /></button>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="btn btn--grad btn--full" style={{ marginTop: 16 }} onClick={duplicateNext}>
        <Icon name="copy" size={18} /> Duplicar a la semana siguiente
      </button>
    </div>
  )
}
