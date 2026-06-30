import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { EmptyState } from '@/components/ui'
import { LineChart, type Point } from '@/components/Charts'
import { useMeasurements, useProfile } from '@/hooks/useData'
import { addMeasurement } from '@/db/repo'
import { MEASUREMENT_LABELS, type MeasurementType, type Units } from '@/db/types'
import { cmToDisplay, displayToCm, lengthUnit } from '@/lib/units'
import { friendlyDate, todayKey } from '@/lib/date'
import { fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'

const TYPES = Object.keys(MEASUREMENT_LABELS) as MeasurementType[]

/** Unidad de la medida: '%' para grasa corporal, longitud en otro caso. */
function unitFor(type: MeasurementType, units: Units): string {
  return type === 'bodyfat' ? '%' : lengthUnit(units)
}
/** Valor almacenado (cm o %) -> valor mostrado en la unidad del usuario. */
function toDisplay(type: MeasurementType, value: number, units: Units): number {
  return type === 'bodyfat' ? value : cmToDisplay(value, units)
}

export default function MeasurementsScreen() {
  const profile = useProfile()
  const measurements = useMeasurements() ?? []
  const units: Units = profile?.units ?? 'metric'

  const [type, setType] = useState<MeasurementType>('waist')
  const [open, setOpen] = useState(false)

  const unit = unitFor(type, units)

  // measurements ya vienen ordenadas por fecha (asc) desde el hook.
  const history = useMemo(
    () => measurements.filter((m) => m.type === type),
    [measurements, type],
  )

  const points: Point[] = history.map((m) => ({
    label: friendlyDate(m.date),
    value: Number(toDisplay(type, m.value, units).toFixed(1)),
  }))
  const latest = history.length ? history[history.length - 1] : null

  return (
    <div className="screen">
      <AppHeader back title="Medidas" />

      {/* Selector del tipo de medida */}
      <div className="chip-row" style={{ marginBottom: 14 }}>
        {TYPES.map((t) => (
          <button
            key={t}
            className={`chip ${type === t ? 'chip--active' : ''}`}
            onClick={() => setType(t)}
          >
            {MEASUREMENT_LABELS[t]}
          </button>
        ))}
      </div>

      {latest ? (
        <>
          <div className="card card--glow" style={{ marginBottom: 14 }}>
            <div className="row between" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
              <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}>
                <span className="label" style={{ margin: 0 }}>{MEASUREMENT_LABELS[type]}</span>
                <span className="big-num" style={{ fontSize: 34 }}>
                  {fmtNum(toDisplay(type, latest.value, units))}
                  <span className="dim" style={{ fontSize: 16, marginLeft: 4 }}>{unit}</span>
                </span>
              </div>
              <span className="cap dim">{friendlyDate(latest.date)}</span>
            </div>
            <LineChart data={points} unit={unit} />
          </div>

          <div className="section-title" style={{ marginBottom: 8 }}>Histórico</div>
          <div className="list">
            {[...history].reverse().map((m) => (
              <div key={m.id} className="list-item">
                <Icon name="ruler" size={20} color="var(--brand)" />
                <span className="list-item__title">{friendlyDate(m.date)}</span>
                <span className="list-item__trail big-num" style={{ fontSize: 15 }}>
                  {fmtNum(toDisplay(type, m.value, units))} {unit}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon="ruler"
          title="Sin registros"
          sub={`Aún no has registrado ${MEASUREMENT_LABELS[type].toLowerCase()}.`}
        />
      )}

      <button className="btn btn--grad btn--full" style={{ marginTop: 16 }} onClick={() => setOpen(true)}>
        <Icon name="plus" size={20} /> Registrar
      </button>

      <RegisterSheet open={open} onClose={() => setOpen(false)} type={type} units={units} />
    </div>
  )
}

function RegisterSheet({
  open, onClose, type, units,
}: {
  open: boolean
  onClose: () => void
  type: MeasurementType
  units: Units
}) {
  const toast = useUI((s) => s.toast)
  const [val, setVal] = useState('')
  const [date, setDate] = useState(todayKey())
  const unit = unitFor(type, units)
  const isPct = type === 'bodyfat'

  // Reiniciar al abrir.
  useEffect(() => {
    if (open) { setVal(''); setDate(todayKey()) }
  }, [open])

  async function save() {
    const display = parseFloat(val)
    if (!display || display <= 0) return
    const stored = isPct ? display : displayToCm(display, units)
    await addMeasurement(date, type, stored)
    toast('Medida registrada', { icon: 'check' })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Registrar ${MEASUREMENT_LABELS[type].toLowerCase()}`}>
      <div className="col gap-3" style={{ paddingBottom: 10 }}>
        <div className="field">
          <span className="label">Valor</span>
          <div className="input-suffix">
            <input
              className="input" type="number" inputMode="decimal" autoFocus placeholder="0"
              value={val} onChange={(e) => setVal(e.target.value)} onFocus={(e) => e.currentTarget.select()}
              style={{ fontSize: 22, fontWeight: 700 }}
            />
            <span>{unit}</span>
          </div>
        </div>
        <div className="field">
          <span className="label">Fecha</span>
          <input
            className="input" type="date" value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </div>
        <button className="btn btn--grad btn--full" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  )
}
