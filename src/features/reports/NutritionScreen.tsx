import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { MultiRing } from '@/components/Ring'
import { useProfile, useDayEntries, useSettings } from '@/hooks/useData'
import { dayTotals, mealTotals } from '@/lib/selectors'
import { macroPercents, netCarbs } from '@/lib/nutrition'
import { NUTRIENT_META } from '@/lib/nutrientMeta'
import { DEFAULT_MEALS, MEAL_LABELS, type Nutrients } from '@/db/types'
import { fmtKcal, fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'
import { friendlyDate } from '@/lib/date'

export default function NutritionScreen() {
  const date = useUI((s) => s.currentDate)
  const profile = useProfile()
  const settings = useSettings()
  const entries = useDayEntries(date) ?? []

  if (!profile) return null
  const totals = dayTotals(entries)
  const mp = macroPercents(totals)
  const net = settings.netCarbsMode

  // Objetivos por nutriente
  const goals: Partial<Record<keyof Nutrients, number>> = {
    calories: profile.calorieGoal,
    carbs: profile.macros.carbsG,
    protein: profile.macros.proteinG,
    fat: profile.macros.fatG,
    fiber: profile.micros.fiber,
    sugar: profile.micros.sugar,
    saturatedFat: profile.micros.saturatedFat,
    cholesterol: profile.micros.cholesterol,
    sodium: profile.micros.sodium,
    potassium: profile.micros.potassium,
    vitaminA: profile.micros.vitaminA,
    vitaminC: profile.micros.vitaminC,
    calcium: profile.micros.calcium,
    iron: profile.micros.iron,
  }

  return (
    <div className="screen">
      <AppHeader back title="Panel de nutrientes" trailing={<span className="cap dim">{friendlyDate(date)}</span>} />

      {/* Anillos de macros */}
      <div className="card col gap-3" style={{ alignItems: 'center', marginBottom: 14 }}>
        <MultiRing size={160} thickness={13} gap={5} segments={[
          { value: totals.carbs, goal: profile.macros.carbsG, color: 'var(--carbs)' },
          { value: totals.protein, goal: profile.macros.proteinG, color: 'var(--protein)' },
          { value: totals.fat, goal: profile.macros.fatG, color: 'var(--fat)' },
        ]}>
          <div className="big-num" style={{ fontSize: 30 }}>{fmtKcal(totals.calories)}</div>
          <div className="label" style={{ margin: 0 }}>/ {fmtKcal(profile.calorieGoal)} kcal</div>
        </MultiRing>
        <div className="row between" style={{ width: '100%' }}>
          <MacroLeg label="Carbos" v={net ? netCarbs(totals) : totals.carbs} g={profile.macros.carbsG} pct={mp.carbs} color="var(--carbs)" net={net} />
          <MacroLeg label="Proteína" v={totals.protein} g={profile.macros.proteinG} pct={mp.protein} color="var(--protein)" />
          <MacroLeg label="Grasa" v={totals.fat} g={profile.macros.fatG} pct={mp.fat} color="var(--fat)" />
        </div>
      </div>

      {/* Tabla de nutrientes vs objetivo */}
      <div className="section-title">Todos los nutrientes</div>
      <div className="list">
        {NUTRIENT_META.filter((m) => settings.showMicros || ['calories', 'carbs', 'protein', 'fat', 'fiber', 'sugar'].includes(m.key)).map((m) => {
          let value = totals[m.key] ?? 0
          let label = m.label
          if (net && m.key === 'carbs') { value = netCarbs(totals); label = 'Carbohidratos netos' }
          const goal = goals[m.key]
          const pct = goal ? Math.min(100, (value / goal) * 100) : 0
          const isMain = ['calories', 'carbs', 'protein', 'fat'].includes(m.key)
          return (
            <div key={m.key} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div className="row between">
                <span style={{ fontWeight: isMain ? 700 : 500, color: m.color, fontSize: isMain ? 15 : 14, paddingLeft: m.indent ? 12 : 0 }}>{label}</span>
                <span className="cap tabnum">
                  <b>{fmtNum(value)}</b>{goal ? ` / ${fmtNum(goal)}` : ''} {m.unit}
                </span>
              </div>
              {goal != null && goal > 0 && (
                <div className="macro-bar"><span style={{ width: `${pct}%`, background: m.color ?? 'var(--brand)' }} /></div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desglose por comida */}
      <div className="section-title">Calorías por comida</div>
      <div className="list">
        {DEFAULT_MEALS.map((meal) => {
          const mt = mealTotals(entries, meal)
          const pct = totals.calories > 0 ? Math.round((mt.calories / totals.calories) * 100) : 0
          const mmp = macroPercents(mt)
          return (
            <div key={meal} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div className="row between">
                <span style={{ fontWeight: 600 }}>{MEAL_LABELS[meal]}</span>
                <span className="cap tabnum"><b>{fmtKcal(mt.calories)}</b> kcal · {pct}%</span>
              </div>
              {mt.calories > 0 && (
                <div className="row gap-1" style={{ height: 7 }}>
                  <span style={{ flex: mmp.carbs || 0.01, background: 'var(--carbs)', borderRadius: 4 }} />
                  <span style={{ flex: mmp.protein || 0.01, background: 'var(--protein)', borderRadius: 4 }} />
                  <span style={{ flex: mmp.fat || 0.01, background: 'var(--fat)', borderRadius: 4 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="legend" style={{ marginTop: 14 }}>
        <span><i style={{ background: 'var(--carbs)' }} /> Carbohidratos</span>
        <span><i style={{ background: 'var(--protein)' }} /> Proteínas</span>
        <span><i style={{ background: 'var(--fat)' }} /> Grasas</span>
      </div>
    </div>
  )
}

function MacroLeg({ label, v, g, pct, color, net }: { label: string; v: number; g: number; pct: number; color: string; net?: boolean }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 1 }}>
      <span className="big-num" style={{ fontSize: 18, color }}>{fmtNum(v)}g</span>
      <span className="label" style={{ margin: 0 }}>{label}{net && label === 'Carbos' ? ' (net)' : ''}</span>
      <span className="cap dim">{fmtNum(g)}g · {pct}%</span>
    </div>
  )
}
