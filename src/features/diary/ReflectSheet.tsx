import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { useProfile, useWeights } from '@/hooks/useData'
import { fiveWeekProjection, latestWeight, type CalorieSummary } from '@/lib/selectors'
import { fmtKcal, fmtNum, fmtSigned } from '@/lib/format'
import { kgToDisplay, weightUnit } from '@/lib/units'

export function ReflectSheet({ open, onClose, summary }: { open: boolean; onClose: () => void; date: string; summary: CalorieSummary }) {
  const profile = useProfile()
  const weights = useWeights() ?? []
  if (!profile) return null

  const curWeight = latestWeight(weights, profile.weightStartKg)
  const dailyBalance = profile.tdee - summary.net // + = déficit (pierde)
  const projected = fiveWeekProjection(curWeight, dailyBalance)
  const change = projected - curWeight
  const u = profile.units

  const onTrack = profile.goalType === 'lose' ? dailyBalance > 0
    : profile.goalType === 'gain' ? dailyBalance < 0 : Math.abs(dailyBalance) < 150

  return (
    <Sheet open={open} onClose={onClose} title="Resumen del día">
      <div className="col gap-3" style={{ paddingBottom: 12 }}>
        <div className="card col gap-2" style={{ alignItems: 'center', textAlign: 'center', background: onTrack ? 'color-mix(in srgb, var(--good) 10%, var(--card))' : 'var(--card)' }}>
          <div className="center-all" style={{ width: 56, height: 56, borderRadius: 999, background: onTrack ? 'color-mix(in srgb, var(--good) 20%, transparent)' : 'color-mix(in srgb, var(--warn) 20%, transparent)' }}>
            <Icon name={onTrack ? 'check-circle' : 'info'} size={30} color={onTrack ? 'var(--good)' : 'var(--warn)'} />
          </div>
          <div className="h2">{summary.food === 0 ? 'Aún sin registros' : onTrack ? '¡Buen trabajo!' : 'Día por encima del plan'}</div>
          <p className="muted" style={{ maxWidth: 320 }}>
            Si cada día fuera como hoy, en <b>5 semanas</b> pesarías aproximadamente{' '}
            <b style={{ color: 'var(--text)' }}>{fmtNum(kgToDisplay(projected, u))} {weightUnit(u)}</b>{' '}
            ({fmtSigned(kgToDisplay(change, u))} {weightUnit(u)}).
          </p>
        </div>

        <div className="list">
          <Row label="Calorías consumidas" value={`${fmtKcal(summary.food)} kcal`} />
          <Row label="Calorías de ejercicio" value={`${fmtKcal(summary.exercise)} kcal`} />
          <Row label="Balance vs mantenimiento" value={`${fmtSigned(-dailyBalance)} kcal`} accent={dailyBalance > 0 ? 'var(--good)' : 'var(--bad)'} />
          <Row label="Objetivo diario" value={`${fmtKcal(summary.goal)} kcal`} />
        </div>

        <button className="btn btn--grad btn--full" onClick={onClose}>
          {onTrack ? 'Seguir así 💪' : 'Entendido'}
        </button>
      </div>
    </Sheet>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="list-item">
      <span className="list-item__title" style={{ fontWeight: 500 }}>{label}</span>
      <span className="list-item__trail tabnum" style={{ fontWeight: 700, color: accent }}>{value}</span>
    </div>
  )
}
