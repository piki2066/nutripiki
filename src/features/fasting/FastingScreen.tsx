import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { es } from 'date-fns/locale'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Ring } from '@/components/Ring'
import { Segmented, ListRow, EmptyState, Pill } from '@/components/ui'
import { db } from '@/db/db'
import type { FastingSession } from '@/db/types'
import { uid } from '@/lib/id'
import { useUI } from '@/lib/store'
import { format } from '@/lib/date'
import { useActiveFast } from '@/hooks/useData'

const HOUR_MS = 3_600_000

interface FastingPlan {
  name: string
  fast: number // horas de ayuno
  eat: number // horas de ventana de comida
}

const PLANS: FastingPlan[] = [
  { name: '12:12', fast: 12, eat: 12 },
  { name: '14:10', fast: 14, eat: 10 },
  { name: '16:8', fast: 16, eat: 8 },
  { name: '18:6', fast: 18, eat: 6 },
]

const DEFAULT_PLAN = '16:8'

/** Formatea una duración en ms como "Xh Ym" (helper local, no hay uno global). */
function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${m}m`
}

/** Hora del reloj (HH:mm) a partir de un epoch en ms. */
function fmtClock(ms: number): string {
  return format(new Date(ms), 'HH:mm')
}

/** Fecha amable a partir de un epoch en ms: "lun, 9 jun". */
function fmtDay(ms: number): string {
  return format(new Date(ms), 'EEE, d MMM', { locale: es })
}

export default function FastingScreen() {
  const active = useActiveFast()
  const toast = useUI((s) => s.toast)

  const [planName, setPlanName] = useState<string>(DEFAULT_PLAN)
  const [now, setNow] = useState<number>(() => Date.now())

  // Contador en vivo: refresca cada segundo y limpia el intervalo al desmontar.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Historial: sesiones cerradas, más recientes primero.
  const history = useLiveQuery(async () => {
    const closed = await db.fasting.filter((f) => f.endTime != null).toArray()
    return closed.sort((a, b) => b.startTime - a.startTime).slice(0, 30)
  }, [])

  async function startFast() {
    const plan = PLANS.find((p) => p.name === planName) ?? PLANS[2]
    const ts = Date.now()
    await db.fasting.add({
      id: uid('fast'),
      startTime: ts,
      targetHours: plan.fast,
      planName: plan.name,
      createdAt: ts,
    })
    toast('Ayuno iniciado', { icon: 'info' })
  }

  async function endFast() {
    if (!active) return
    await db.fasting.update(active.id, { endTime: Date.now() })
    toast('Ayuno completado', { icon: 'check' })
  }

  // Mientras el hook resuelve (undefined) evitamos parpadeo de UI.
  if (active === undefined) {
    return (
      <div className="screen">
        <AppHeader back title="Ayuno intermitente" />
      </div>
    )
  }

  return (
    <div className="screen">
      <AppHeader back title="Ayuno intermitente" />

      {active ? (
        <ActiveFast session={active} now={now} onEnd={endFast} />
      ) : (
        <PlanPicker planName={planName} onPick={setPlanName} onStart={startFast} />
      )}

      {/* Historial */}
      <div className="h2" style={{ margin: '22px 0 12px' }}>Historial</div>
      {history && history.length > 0 ? (
        <div className="card" style={{ padding: 6 }}>
          {history.map((s) => (
            <HistoryRow key={s.id} session={s} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="fasting"
          title="Sin ayunos todavía"
          sub="Cuando termines un ayuno aparecerá aquí tu registro."
        />
      )}
    </div>
  )
}

function ActiveFast({ session, now, onEnd }: { session: FastingSession; now: number; onEnd: () => void }) {
  const elapsedMs = Math.max(0, now - session.startTime)
  const elapsedHours = elapsedMs / HOUR_MS
  const endTime = session.startTime + session.targetHours * HOUR_MS
  const percent = Math.round((elapsedHours / session.targetHours) * 100)
  const reached = elapsedHours >= session.targetHours

  return (
    <>
      <div className="card card--glow" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="fasting" size={20} color="var(--brand)" />
            <span className="h3">Plan {session.planName}</span>
          </div>
          <Pill
            color={reached ? 'color-mix(in srgb, var(--good) 18%, transparent)' : undefined}
            text={reached ? 'var(--good)' : undefined}
          >
            {reached ? 'Objetivo alcanzado' : 'En curso'}
          </Pill>
        </div>

        <div className="row center" style={{ margin: '10px 0 6px' }}>
          <Ring
            value={elapsedHours}
            goal={session.targetHours}
            size={196}
            thickness={16}
            color={reached ? 'var(--good)' : 'var(--brand)'}
          >
            <div className="big-num tabnum" style={{ fontSize: 38, color: reached ? 'var(--good)' : 'var(--text)' }}>
              {fmtDuration(elapsedMs)}
            </div>
            <div className="label" style={{ margin: 0 }}>de {session.targetHours} h</div>
            <div className="cap dim tabnum" style={{ marginTop: 2 }}>{percent}%</div>
          </Ring>
        </div>

        <div className="row between" style={{ marginTop: 8 }}>
          <InfoStat icon="clock" label="Inicio" value={fmtClock(session.startTime)} />
          <InfoStat icon="target" label="Fin estimado" value={fmtClock(endTime)} />
        </div>
      </div>

      <button className="btn btn--grad btn--full" onClick={onEnd}>
        <Icon name="check-circle" size={20} /> Terminar ayuno
      </button>
    </>
  )
}

function PlanPicker({
  planName, onPick, onStart,
}: {
  planName: string
  onPick: (v: string) => void
  onStart: () => void
}) {
  const plan = PLANS.find((p) => p.name === planName) ?? PLANS[2]

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 12 }}>
          <Icon name="fasting" size={20} color="var(--brand)" />
          <span className="h3">Elige tu plan</span>
        </div>

        <Segmented
          options={PLANS.map((p) => ({ value: p.name, label: p.name }))}
          value={planName}
          onChange={onPick}
        />

        <div className="row between" style={{ marginTop: 16 }}>
          <PlanStat icon="flame" color="var(--brand)" label="Ayuno" value={`${plan.fast} h`} />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--fill)', margin: '4px 0' }} />
          <PlanStat icon="cutlery" color="var(--brand-2)" label="Ventana de comida" value={`${plan.eat} h`} />
        </div>

        <div className="cap dim" style={{ marginTop: 14, textAlign: 'center' }}>
          Ayunarás {plan.fast} horas y comerás dentro de una ventana de {plan.eat} horas.
        </div>
      </div>

      <button className="btn btn--grad btn--full" onClick={onStart}>
        <Icon name="fasting" size={20} /> Iniciar ayuno
      </button>
    </>
  )
}

function HistoryRow({ session }: { session: FastingSession }) {
  const end = session.endTime ?? session.startTime
  const durationMs = Math.max(0, end - session.startTime)
  const durationHours = durationMs / HOUR_MS
  const reached = durationHours >= session.targetHours

  return (
    <ListRow
      icon={reached ? 'check-circle' : 'clock'}
      iconColor={reached ? 'var(--good)' : 'var(--text-3)'}
      title={`${session.planName} · ${fmtDuration(durationMs)}`}
      sub={`${fmtDay(session.startTime)} · ${fmtClock(session.startTime)}–${fmtClock(end)}`}
      trailing={
        <Pill
          color={reached ? 'color-mix(in srgb, var(--good) 18%, transparent)' : undefined}
          text={reached ? 'var(--good)' : undefined}
        >
          {reached ? 'Logrado' : 'Parcial'}
        </Pill>
      }
    />
  )
}

function InfoStat({ icon, label, value }: { icon: 'clock' | 'target'; label: string; value: string }) {
  return (
    <div className="row gap-2" style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
      <Icon name={icon} size={18} color="var(--text-3)" />
      <div className="col" style={{ gap: 1, alignItems: 'flex-start' }}>
        <span className="label" style={{ margin: 0 }}>{label}</span>
        <span className="big-num tabnum" style={{ fontSize: 16 }}>{value}</span>
      </div>
    </div>
  )
}

function PlanStat({
  icon, color, label, value,
}: {
  icon: 'flame' | 'cutlery'
  color: string
  label: string
  value: string
}) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <div
        className="center-all"
        style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        <Icon name={icon} size={20} color={color} />
      </div>
      <div className="big-num" style={{ fontSize: 20 }}>{value}</div>
      <div className="label" style={{ margin: 0 }}>{label}</div>
    </div>
  )
}
