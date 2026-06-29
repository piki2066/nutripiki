import { db } from '@/db/db'
import { MEAL_LABELS } from '@/db/types'
import { lastNDays } from './date'
import { NUTRIENT_META } from './nutrientMeta'

function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Exporta el diario de comidas (últimos N días) a CSV, estilo "Meal Level Nutrition". */
export async function exportDiaryCsv(days = 30): Promise<void> {
  const dates = new Set(lastNDays(days))
  const all = await db.foodEntries.toArray()
  const rows = all.filter((e) => dates.has(e.date)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))

  const cols = ['Fecha', 'Comida', 'Alimento', 'Marca', 'Ración', 'Cantidad', ...NUTRIENT_META.map((m) => `${m.label} (${m.unit})`)]
  const lines = [cols.map(csvCell).join(',')]
  for (const e of rows) {
    const base = [e.date, MEAL_LABELS[e.meal], e.name, e.brand ?? '', e.servingLabel, e.quantity]
    const nutr = NUTRIENT_META.map((m) => Math.round(((e.nutrients[m.key] ?? 0) as number) * 10) / 10)
    lines.push([...base, ...nutr].map(csvCell).join(','))
  }
  downloadText(`nutripal-diario-${dates.size}d.csv`, lines.join('\n'))
}

/** Exporta historial de peso y medidas. */
export async function exportProgressCsv(): Promise<void> {
  const weights = await db.weights.orderBy('date').toArray()
  const measurements = await db.measurements.orderBy('date').toArray()
  const lines = ['Tipo,Fecha,Valor']
  for (const w of weights) lines.push(['Peso (kg)', w.date, w.weightKg].map(csvCell).join(','))
  for (const m of measurements) lines.push([m.type, m.date, m.value].map(csvCell).join(','))
  downloadText('nutripal-progreso.csv', lines.join('\n'))
}
