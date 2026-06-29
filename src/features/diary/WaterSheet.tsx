import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { addWater, clearLastWater } from '@/db/repo'
import { useDayWater, useProfile } from '@/hooks/useData'
import { fmtNum } from '@/lib/format'
import { useUI } from '@/lib/store'

const PRESETS = [200, 250, 330, 500]

export function WaterSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const water = useDayWater(date) ?? []
  const profile = useProfile()
  const toast = useUI((s) => s.toast)
  const total = water.reduce((s, w) => s + w.amountMl, 0)
  const goal = profile?.waterGoalMl ?? 2000

  return (
    <Sheet open={open} onClose={onClose} title="Agua">
      <div className="col gap-4" style={{ paddingBottom: 10 }}>
        <div className="card col gap-2" style={{ alignItems: 'center' }}>
          <Icon name="water" size={32} fill color="var(--brand)" />
          <div className="big-num" style={{ fontSize: 36, color: 'var(--brand)' }}>{fmtNum(total / 1000)} L</div>
          <span className="cap">de {fmtNum(goal / 1000)} L objetivo</span>
          <div className="macro-bar" style={{ width: '100%' }}>
            <span style={{ width: `${Math.min(100, (total / goal) * 100)}%`, background: 'var(--brand)' }} />
          </div>
        </div>
        <div>
          <span className="label">Añadir</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            {PRESETS.map((ml) => (
              <button key={ml} className="btn btn--soft" onClick={async () => { await addWater(date, ml); toast(`+${ml} ml`, { icon: 'check' }) }}>
                <Icon name="plus" size={18} /> {ml} ml
              </button>
            ))}
          </div>
        </div>
        {total > 0 && (
          <button className="btn btn--ghost" onClick={() => clearLastWater(date)}>
            <Icon name="undo" size={18} /> Quitar último
          </button>
        )}
      </div>
    </Sheet>
  )
}
