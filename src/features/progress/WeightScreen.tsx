import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Segmented, EmptyState } from '@/components/ui'
import { LineChart, type Point } from '@/components/Charts'
import { WeightSheet } from './WeightSheet'
import { useProfile, useWeights } from '@/hooks/useData'
import { deleteWeight } from '@/db/repo'
import { latestWeight } from '@/lib/selectors'
import { weightTrend, latestTrend, trendRatePerWeek, goalEta } from '@/lib/analytics'
import { kgToDisplay, weightUnit } from '@/lib/units'
import { fmtNum, fmtSigned } from '@/lib/format'
import { todayKey, parseKey } from '@/lib/date'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Range = '30' | '90' | '365' | 'all'

export default function WeightScreen() {
  const profile = useProfile()
  const weights = useWeights() ?? []
  const [range, setRange] = useState<Range>('90')
  const [open, setOpen] = useState(false)

  if (!profile) return null
  const u = profile.units
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1))
  const current = latestWeight(weights, profile.weightStartKg)
  const start = profile.weightStartKg
  const goal = profile.weightGoalKg
  const changed = current - start
  const toGoal = current - goal

  const days = range === 'all' ? 99999 : parseInt(range)
  const cutoff = Date.now() - days * 86400000
  const filtered = sorted.filter((w) => parseKey(w.date).getTime() >= cutoff || range === 'all')
  const points: Point[] = filtered.map((w) => ({
    label: format(parseKey(w.date), 'd MMM', { locale: es }),
    value: kgToDisplay(w.weightKg, u),
  }))

  // Tendencia (EMA) sobre el histórico completo, alineada al rango mostrado.
  const trendAll = weightTrend(sorted)
  const trendMap = new Map(trendAll.map((t) => [t.date, t.trend]))
  const trendPoints: Point[] = filtered.map((w) => ({
    label: '',
    value: trendMap.has(w.date) ? kgToDisplay(trendMap.get(w.date)!, u) : null,
  }))
  const currentTrendKg = latestTrend(trendAll) ?? current
  const ratePerWeek = trendRatePerWeek(trendAll)
  const eta = goalEta(currentTrendKg, goal, ratePerWeek ?? 0, todayKey())

  const totalToLose = Math.abs(start - goal)
  const doneToGoal = Math.abs(start - current)
  const progressPct = totalToLose > 0 ? Math.min(100, (doneToGoal / totalToLose) * 100) : 0

  return (
    <div className="screen">
      <AppHeader back title="Peso"
        trailing={<button className="icon-btn icon-btn--fill" onClick={() => setOpen(true)}><Icon name="plus" size={22} color="var(--brand)" /></button>} />

      <div className="card card--glow col gap-3" style={{ marginBottom: 14 }}>
        <div className="row between">
          <div className="col" style={{ gap: 2 }}>
            <span className="label">Peso actual</span>
            <div className="big-num" style={{ fontSize: 38 }}>{fmtNum(kgToDisplay(current, u))} <span style={{ fontSize: 18 }} className="muted">{weightUnit(u)}</span></div>
          </div>
          <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
            <span className="badge" style={{ background: changed <= 0 ? 'color-mix(in srgb, var(--good) 18%, transparent)' : 'color-mix(in srgb, var(--warn) 18%, transparent)', color: changed <= 0 ? 'var(--good)' : 'var(--warn)' }}>
              {fmtSigned(kgToDisplay(changed, u))} {weightUnit(u)}
            </span>
            <span className="cap dim">desde el inicio</span>
          </div>
        </div>
        <div className="macro-bar"><span style={{ width: `${progressPct}%`, background: 'var(--brand-grad)' }} /></div>
        <div className="row between">
          <span className="cap dim">Inicio {fmtNum(kgToDisplay(start, u))}</span>
          <span className="cap" style={{ fontWeight: 700 }}>{fmtNum(progressPct)}% al objetivo</span>
          <span className="cap dim">Meta {fmtNum(kgToDisplay(goal, u))}</span>
        </div>
      </div>

      {points.length >= 2 ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className="h3">Tendencia</span>
            <span className="cap" style={{ color: toGoal > 0 ? 'var(--warn)' : 'var(--good)' }}>
              {fmtNum(Math.abs(kgToDisplay(toGoal, u)))} {weightUnit(u)} {toGoal > 0 ? 'para la meta' : '¡meta alcanzada!'}
            </span>
          </div>
          <LineChart data={points} series2={trendPoints} series2Color="var(--text-2)"
            goal={kgToDisplay(goal, u)} color="var(--brand)" height={200} unit={weightUnit(u)} />
          <div className="row gap-3" style={{ marginTop: 6, justifyContent: 'center' }}>
            <span className="cap dim"><span style={{ color: 'var(--brand)' }}>●</span> Registros</span>
            <span className="cap dim"><span style={{ color: 'var(--text-2)' }}>┄</span> Tendencia</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <Segmented value={range} onChange={setRange} options={[
              { value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: '365', label: '1a' }, { value: 'all', label: 'Todo' },
            ]} />
          </div>
        </div>
      ) : (
        <EmptyState icon="scale" title="Registra tu peso" sub="Con 2 o más registros verás tu tendencia." />
      )}

      {/* Tendencia y previsión de meta */}
      {weights.length >= 3 && (
        <div className="card col gap-3" style={{ marginBottom: 14 }}>
          <div className="row between">
            <span className="h3">Tendencia y previsión</span>
            <Icon name="target" size={18} color="var(--brand)" />
          </div>
          <div className="row between">
            <div className="col" style={{ gap: 2 }}>
              <span className="label" style={{ margin: 0 }}>Peso de tendencia</span>
              <span className="big-num" style={{ fontSize: 22 }}>{fmtNum(kgToDisplay(currentTrendKg, u))} <span className="muted" style={{ fontSize: 13 }}>{weightUnit(u)}</span></span>
            </div>
            <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
              <span className="label" style={{ margin: 0 }}>Ritmo</span>
              <span className="big-num" style={{ fontSize: 22, color: ratePerWeek == null ? 'var(--text-3)' : 'var(--brand)' }}>
                {ratePerWeek == null ? '—' : `${fmtSigned(kgToDisplay(ratePerWeek, u))}`} <span className="muted" style={{ fontSize: 13 }}>{weightUnit(u)}/sem</span>
              </span>
            </div>
          </div>
          <div className="row gap-2" style={{ alignItems: 'center', borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
            <Icon name="calendar" size={18} color="var(--brand)" />
            <span className="cap">
              {ratePerWeek == null
                ? 'Registra tu peso unos días para ver la previsión.'
                : eta.reachable && eta.date
                  ? <>Llegarás a {fmtNum(kgToDisplay(goal, u))} {weightUnit(u)} ≈ <b>{format(parseKey(eta.date), "d 'de' MMM yyyy", { locale: es })}</b></>
                  : eta.reachable
                    ? 'Meta alcanzable, pero muy lejana al ritmo actual.'
                    : 'Tu tendencia no avanza hacia la meta todavía.'}
            </span>
          </div>
        </div>
      )}

      <div className="section-title">Historial</div>
      <div className="list">
        {[...sorted].reverse().map((w) => (
          <div key={w.id} className="list-item">
            <Icon name="scale" size={20} color="var(--text-2)" />
            <span className="list-item__title">{w.date === todayKey() ? 'Hoy' : format(parseKey(w.date), "d 'de' MMM yyyy", { locale: es })}</span>
            <span className="list-item__trail tabnum" style={{ fontWeight: 700 }}>{fmtNum(kgToDisplay(w.weightKg, u))} {weightUnit(u)}</span>
            <button className="icon-btn" onClick={() => deleteWeight(w.id)} aria-label="Borrar"><Icon name="trash" size={16} color="var(--text-3)" /></button>
          </div>
        ))}
        {!sorted.length && <div className="empty"><span className="cap dim">Sin registros de peso</span></div>}
      </div>

      <WeightSheet open={open} onClose={() => setOpen(false)} date={todayKey()} />
    </div>
  )
}
