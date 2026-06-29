import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '@/components/Sheet'
import { Icon, type IconName } from '@/components/Icon'
import { useUI } from '@/lib/store'
import { QuickAddSheet } from '@/features/foods/QuickAddSheet'
import { WeightSheet } from '@/features/progress/WeightSheet'
import { WaterSheet } from '@/features/diary/WaterSheet'

/** Menú de acción rápida del botón "+" central. */
export function QuickActionSheet() {
  const nav = useNavigate()
  const open = useUI((s) => s.quickOpen)
  const setOpen = useUI((s) => s.setQuickOpen)
  const date = useUI((s) => s.currentDate)
  const [quickAdd, setQuickAdd] = useState(false)
  const [weight, setWeight] = useState(false)
  const [water, setWater] = useState(false)

  const go = (path: string) => { setOpen(false); nav(path) }

  const actions: { icon: IconName; label: string; color: string; run: () => void }[] = [
    { icon: 'search', label: 'Buscar alimento', color: 'var(--brand)', run: () => go(`/add?date=${date}&meal=breakfast`) },
    { icon: 'scan', label: 'Escanear código', color: 'var(--brand-2)', run: () => go(`/add?date=${date}&meal=breakfast&scan=1`) },
    { icon: 'bolt', label: 'Registro rápido', color: 'var(--carbs)', run: () => { setOpen(false); setQuickAdd(true) } },
    { icon: 'dumbbell', label: 'Ejercicio', color: 'var(--protein)', run: () => go('/exercise') },
    { icon: 'water', label: 'Agua', color: 'var(--brand)', run: () => { setOpen(false); setWater(true) } },
    { icon: 'scale', label: 'Peso', color: 'var(--fat)', run: () => { setOpen(false); setWeight(true) } },
  ]

  return (
    <>
      <Sheet open={open} onClose={() => setOpen(false)} title="Añadir registro">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingBottom: 8 }}>
          {actions.map((a) => (
            <button key={a.label} className="card card--tap col gap-2" style={{ alignItems: 'center', padding: '16px 8px' }} onClick={a.run}>
              <div className="center-all" style={{ width: 48, height: 48, borderRadius: 14, background: `color-mix(in srgb, ${a.color} 16%, transparent)` }}>
                <Icon name={a.icon} size={24} color={a.color} />
              </div>
              <span className="cap" style={{ fontWeight: 600, textAlign: 'center', fontSize: 12 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </Sheet>
      <QuickAddSheet open={quickAdd} onClose={() => setQuickAdd(false)} date={date} defaultMeal="breakfast" />
      <WeightSheet open={weight} onClose={() => setWeight(false)} date={date} />
      <WaterSheet open={water} onClose={() => setWater(false)} date={date} />
    </>
  )
}
