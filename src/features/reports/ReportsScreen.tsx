import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Segmented, Stat, EmptyState } from '@/components/ui'
import { BarChart, LineChart, type Point } from '@/components/Charts'
import { db } from '@/db/db'
import { useProfile } from '@/hooks/useData'
import { sumNutrients } from '@/lib/nutrition'
import type { Nutrients } from '@/db/types'
import { fmtKcal, fmtNum } from '@/lib/format'
import { lastNDays, parseKey } from '@/lib/date'
import { exportDiaryCsv } from '@/lib/export'
import { useUI } from '@/lib/store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type RangeKey = '7' | '30' | '90'
type Metric = 'calories' | 'carbs' | 'protein' | 'fat'

const METRICS: { key: Metric; label: string; color: string; unit: string }[] = [
  { key: 'calories', label: 'Calorías', color: 'var(--cal)', unit: 'kcal' },
  { key: 'carbs', label: 'Carbos', color: 'var(--carbs)', unit: 'g' },
  { key: 'protein', label: 'Proteína', color: 'var(--protein)', unit: 'g' },
  { key: 'fat', label: 'Grasa', color: 'var(--fat)', unit: 'g' },
]

export default function ReportsScreen() {
  const profile = useProfile()
  const toast = useUI((s) => s.toast)
  const [range, setRange] = useState<RangeKey>('30')
  const [metric, setMetric] = useState<Metric>('calories')

  const days = lastNDays(parseInt(range))
  const data = useLiveQuery(async () => {
    const perDay: { date: string; totals: Nutrients }[] = []
    const foodCount: Record<string, { name: string; cals: number; count: number }> = {}
    for (const d of days) {
      const entries = await db.foodEntries.where('date').equals(d).toArray()
      perDay.push({ date: d, totals: sumNutrients(entries.map((e) => e.nutrients)) })
      for (const e of entries) {
        const k = e.name
        if (!foodCount[k]) foodCount[k] = { name: e.name, cals: 0, count: 0 }
        foodCount[k].cals += e.nutrients.calories
        foodCount[k].count += 1
      }
    }
    const topFoods = Object.values(foodCount).sort((a, b) => b.cals - a.cals).slice(0, 8)
    return { perDay, topFoods }
  }, [days.join(',')], null)

  if (!profile) return null

  const perDay = data?.perDay ?? []
  const loggedDays = perDay.filter((d) => d.totals.calories > 0)
  const m = METRICS.find((x) => x.key === metric)!
  const goal = metric === 'calories' ? profile.calorieGoal
    : metric === 'carbs' ? profile.macros.carbsG
      : metric === 'protein' ? profile.macros.proteinG : profile.macros.fatG

  const avg = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + (d.totals[metric] as number), 0) / loggedDays.length)
    : 0
  const maxV = Math.max(...loggedDays.map((d) => d.totals[metric] as number), 0)
  const minV = loggedDays.length ? Math.min(...loggedDays.map((d) => d.totals[metric] as number)) : 0

  const chartData: Point[] = perDay.map((d) => ({
    label: format(parseKey(d.date), parseInt(range) <= 7 ? 'EEEEE' : 'd/M', { locale: es }),
    value: d.totals.calories > 0 ? Math.round(d.totals[metric] as number) : null,
  }))

  return (
    <div className="screen">
      <AppHeader back title="Reportes"
        trailing={<button className="icon-btn icon-btn--fill" onClick={async () => { await exportDiaryCsv(parseInt(range)); toast('CSV exportado', { icon: 'check' }) }} aria-label="Exportar"><Icon name="download" size={20} /></button>} />

      <div style={{ marginBottom: 12 }}>
        <Segmented value={range} onChange={setRange} options={[
          { value: '7', label: '7 días' }, { value: '30', label: '30 días' }, { value: '90', label: '90 días' },
        ]} />
      </div>

      <div className="chip-row" style={{ marginBottom: 14 }}>
        {METRICS.map((x) => (
          <button key={x.key} className={`chip ${metric === x.key ? 'chip--active' : ''}`} onClick={() => setMetric(x.key)}>{x.label}</button>
        ))}
      </div>

      {!loggedDays.length ? (
        <EmptyState icon="chart" title="Sin datos todavía" sub="Registra comidas para ver tus tendencias." />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <Stat label="Media" value={`${fmtKcal(avg)}`} accent={m.color} />
              <Stat label="Máximo" value={fmtKcal(maxV)} />
              <Stat label="Mínimo" value={fmtKcal(minV)} />
              <Stat label="Objetivo" value={fmtKcal(goal)} />
            </div>
            {parseInt(range) <= 14
              ? <BarChart data={chartData} goal={goal} color={m.color} height={180} />
              : <LineChart data={chartData} goal={goal} color={m.color} height={180} unit={m.unit} />}
            <p className="cap dim center-all" style={{ marginTop: 8 }}>Media sobre {loggedDays.length} días registrados · línea = objetivo</p>
          </div>

          <div className="section-title">Alimentos con más calorías</div>
          <div className="list">
            {(data?.topFoods ?? []).map((f, i) => (
              <div key={i} className="list-item">
                <span className="big-num dim" style={{ width: 22, fontSize: 15 }}>{i + 1}</span>
                <div className="col" style={{ gap: 1, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                  <span className="list-item__title ellipsis">{f.name}</span>
                  <span className="list-item__sub">{f.count} veces</span>
                </div>
                <span className="tabnum" style={{ fontWeight: 700 }}>{fmtKcal(f.cals)} kcal</span>
              </div>
            ))}
          </div>

          <button className="btn btn--soft btn--full" style={{ marginTop: 16 }} onClick={async () => { await exportDiaryCsv(parseInt(range)); toast('CSV exportado', { icon: 'check' }) }}>
            <Icon name="download" size={18} /> Exportar diario a CSV
          </button>
        </>
      )}
    </div>
  )
}
