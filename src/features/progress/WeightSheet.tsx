import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { addWeight, patchProfile, getProfile } from '@/db/repo'
import { recomputeGoals } from '@/lib/profile'
import { useProfile } from '@/hooks/useData'
import { displayToKg, kgToDisplay, weightUnit } from '@/lib/units'
import { useUI } from '@/lib/store'

export function WeightSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const profile = useProfile()
  const toast = useUI((s) => s.toast)
  const units = profile?.units ?? 'metric'
  const [val, setVal] = useState('')

  // Empieza vacío cada vez que se abre, para escribir directamente.
  useEffect(() => { if (open) setVal('') }, [open])

  async function save() {
    const display = parseFloat(val)
    if (!display || display <= 0) return
    const kg = displayToKg(display, units)
    await addWeight(date, kg)
    // Recalcular calorías con el nuevo peso (si no son manuales)
    const p = await getProfile()
    if (p && !p.manualCalories) {
      const updated = recomputeGoals(p, kg)
      await patchProfile({ calorieGoal: updated.calorieGoal, tdee: updated.tdee, bmr: updated.bmr })
    }
    toast('Peso registrado', { icon: 'check' })
    setVal('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar peso">
      <div className="col gap-3" style={{ paddingBottom: 10 }}>
        {profile && (
          <p className="cap dim">Objetivo: {kgToDisplay(profile.weightGoalKg, units).toFixed(1)} {weightUnit(units)}</p>
        )}
        <div className="field">
          <span className="label">Peso de hoy</span>
          <div className="input-suffix">
            <input className="input" type="number" inputMode="decimal" autoFocus placeholder="0.0"
              value={val} onChange={(e) => setVal(e.target.value)} onFocus={(e) => e.currentTarget.select()}
              style={{ fontSize: 24, fontWeight: 700 }} />
            <span>{weightUnit(units)}</span>
          </div>
        </div>
        <button className="btn btn--grad btn--full" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  )
}
