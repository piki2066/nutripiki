import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Stat } from './ui'
import type { WeekCalories } from '@/lib/selectors'
import type { Units } from '@/db/types'
import { fmtKcal, fmtNum } from '@/lib/format'
import { kgToDisplay, weightUnit } from '@/lib/units'

/**
 * Suma de calorías de los 7 días de la semana frente al objetivo semanal.
 * Se usa igual en el Plan semanal y en Progreso.
 */
export function WeekCaloriesCard({ wk, units, title = 'Calorías de la semana', action, children }: {
  wk: WeekCalories
  units: Units
  title?: string
  action?: ReactNode
  children?: ReactNode
}) {
  const pct = wk.budget > 0 ? Math.min(100, (wk.eaten / wk.budget) * 100) : 0
  const planPct = wk.budget > 0 ? Math.min(100, (wk.planned / wk.budget) * 100) : 0
  const over = wk.eaten > wk.budget
  const nothing = wk.eaten === 0 && wk.planned === 0
  const kgTxt = `${fmtNum(kgToDisplay(Math.abs(wk.balanceKg), units), 2)} ${weightUnit(units)}`

  const insight = (() => {
    if (nothing) return 'Aún no hay nada registrado en esta semana.'
    if (wk.isPast) {
      return wk.balance >= 0
        ? `Semana cerrada con ${fmtKcal(wk.balance)} kcal de margen (≈ ${kgTxt} menos de lo previsto).`
        : `Semana cerrada con ${fmtKcal(-wk.balance)} kcal de más (≈ ${kgTxt} por encima).`
    }
    if (!wk.isCurrent && wk.elapsedDays === 0) {
      return `Semana por empezar. Tienes ${fmtKcal(wk.budget)} kcal de presupuesto para los 7 días.`
    }
    const head = wk.balance >= 0
      ? `Hasta hoy vas ${fmtKcal(wk.balance)} kcal por debajo de tu objetivo.`
      : `Hasta hoy llevas ${fmtKcal(-wk.balance)} kcal de más.`
    if (wk.remainingDays <= 0) return head
    const tail = wk.left >= 0
      ? ` Quedan ${wk.remainingDays} ${wk.remainingDays === 1 ? 'día' : 'días'}: puedes tomar ~${fmtKcal(wk.perRemainingDay)} kcal/día.`
      : ` Ya te has pasado ${fmtKcal(-wk.left)} kcal del presupuesto de la semana.`
    return head + tail
  })()

  const good = wk.balance >= 0 && wk.left >= 0

  return (
    <div className="card card--glow col gap-3" style={{ marginBottom: 14 }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <span className="label" style={{ margin: 0 }}>{title}</span>
        {action}
      </div>

      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <span className="big-num t-cal" style={{ fontSize: 30, color: over ? 'var(--bad)' : undefined }}>
          {fmtKcal(wk.eaten)} <span className="muted" style={{ fontSize: 13 }}>de {fmtKcal(wk.budget)} kcal</span>
        </span>
        <span className="badge badge--soft tabnum" style={{ color: over ? 'var(--bad)' : 'var(--text-2)' }}>
          {Math.round(wk.budget > 0 ? (wk.eaten / wk.budget) * 100 : 0)}%
        </span>
      </div>

      {/* Barra: comido (sólido) sobre el total apuntado (tenue) */}
      <div className="macro-bar" style={{ position: 'relative' }}>
        <span style={{ width: `${planPct}%`, background: 'var(--fill-2)', position: 'absolute', inset: 0, borderRadius: 999 }} />
        <span style={{ width: `${pct}%`, background: over ? 'var(--bad)' : 'var(--brand)' }} />
      </div>

      <div className="row between" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
        <Stat label="Media/día" value={fmtKcal(wk.avgPerDay)} />
        <Stat label="Con el plan" value={fmtKcal(wk.planned)} />
        <Stat
          label={wk.left >= 0 ? 'Te quedan' : 'De más'}
          value={fmtKcal(Math.abs(wk.left))}
          accent={wk.left >= 0 ? 'var(--good)' : 'var(--bad)'}
        />
      </div>

      {children}

      <div className="row gap-2" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
        <Icon name={nothing ? 'info' : good ? 'check-circle' : 'info'} size={18}
          color={nothing ? 'var(--text-3)' : good ? 'var(--good)' : 'var(--warn)'} style={{ flexShrink: 0, marginTop: 1 }} />
        <span className="cap">{insight}</span>
      </div>
    </div>
  )
}
