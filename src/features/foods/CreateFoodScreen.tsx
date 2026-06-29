import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { upsertFood } from '@/db/repo'
import type { Food, Nutrients } from '@/db/types'
import { EMPTY_NUTRIENTS } from '@/db/types'
import { uid } from '@/lib/id'
import { useUI } from '@/lib/store'

interface FieldDef { key: keyof Nutrients; label: string; unit: string; main?: boolean }
const FIELDS: FieldDef[] = [
  { key: 'calories', label: 'Calorías', unit: 'kcal', main: true },
  { key: 'carbs', label: 'Carbohidratos', unit: 'g', main: true },
  { key: 'protein', label: 'Proteínas', unit: 'g', main: true },
  { key: 'fat', label: 'Grasas', unit: 'g', main: true },
  { key: 'fiber', label: 'Fibra', unit: 'g' },
  { key: 'sugar', label: 'Azúcares', unit: 'g' },
  { key: 'saturatedFat', label: 'Grasa saturada', unit: 'g' },
  { key: 'transFat', label: 'Grasa trans', unit: 'g' },
  { key: 'cholesterol', label: 'Colesterol', unit: 'mg' },
  { key: 'sodium', label: 'Sodio', unit: 'mg' },
  { key: 'potassium', label: 'Potasio', unit: 'mg' },
  { key: 'vitaminA', label: 'Vitamina A', unit: '%' },
  { key: 'vitaminC', label: 'Vitamina C', unit: '%' },
  { key: 'calcium', label: 'Calcio', unit: '%' },
  { key: 'iron', label: 'Hierro', unit: '%' },
]

export default function CreateFoodScreen() {
  const nav = useNavigate()
  const toast = useUI((s) => s.toast)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [barcode, setBarcode] = useState('')
  const [servingLabel, setServingLabel] = useState('1 ración')
  const [servingGrams, setServingGrams] = useState('100')
  const [isLiquid, setIsLiquid] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }))
  const num = (k: keyof Nutrients) => parseFloat(vals[k]) || 0

  async function save() {
    const grams = parseFloat(servingGrams) || 100
    const per100: Nutrients = { ...EMPTY_NUTRIENTS }
    for (const f of FIELDS) per100[f.key] = (num(f.key) * 100) / grams
    const food: Food = {
      id: uid('custom'),
      name: name.trim() || 'Alimento sin nombre',
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
      source: 'custom',
      verified: false,
      per100,
      isLiquid,
      servings: [
        { id: uid('sv'), label: servingLabel.trim() || '1 ración', grams, isDefault: true },
        { id: uid('sv'), label: isLiquid ? '100 ml' : '100 g', grams: 100 },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await upsertFood(food)
    toast('Alimento creado', { icon: 'check' })
    nav(-1)
  }

  const valid = name.trim().length > 0 && (parseFloat(vals.calories) || 0) >= 0

  return (
    <div className="screen">
      <AppHeader back title="Crear alimento"
        trailing={<button className="chip chip--active" onClick={save} style={{ opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}>Guardar</button>} />

      <div className="col gap-3">
        <div className="field">
          <span className="label">Nombre *</span>
          <input className="input" placeholder="p. ej. Yogur de coco casero" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="row gap-2">
          <div className="field grow">
            <span className="label">Marca</span>
            <input className="input" placeholder="Opcional" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="field grow">
            <span className="label">Código de barras</span>
            <input className="input" inputMode="numeric" placeholder="Opcional" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
        </div>

        <div className="section-title" style={{ margin: '8px 0 0' }}>Ración</div>
        <div className="row gap-2">
          <div className="field grow">
            <span className="label">Descripción</span>
            <input className="input" placeholder="1 vaso, 1 unidad…" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Peso</span>
            <div className="input-suffix">
              <input className="input" inputMode="decimal" value={servingGrams} onChange={(e) => setServingGrams(e.target.value)} style={{ width: 110 }} />
              <span>{isLiquid ? 'ml' : 'g'}</span>
            </div>
          </div>
        </div>
        <button className="chip" onClick={() => setIsLiquid((v) => !v)} style={{ alignSelf: 'flex-start' }}>
          <Icon name={isLiquid ? 'check-circle' : 'water'} size={16} /> {isLiquid ? 'Líquido (ml)' : 'Marcar como líquido'}
        </button>

        <div className="section-title" style={{ marginBottom: 0 }}>Información nutricional (por ración)</div>
        <div className="list">
          {FIELDS.filter((f) => f.main || showAll).map((f) => (
            <div key={f.key} className="list-item">
              <span className="list-item__title" style={{ fontWeight: f.main ? 700 : 500 }}>{f.label}</span>
              <div className="input-suffix" style={{ width: 120 }}>
                <input className="input" inputMode="decimal" placeholder="0" value={vals[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                  style={{ textAlign: 'right', height: 40, paddingRight: 34 }} />
                <span style={{ top: '50%' }}>{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn--ghost" onClick={() => setShowAll((v) => !v)}>
          <Icon name={showAll ? 'chevron-down' : 'plus'} size={18} /> {showAll ? 'Ocultar nutrientes detallados' : 'Añadir más nutrientes'}
        </button>

        <button className="btn btn--grad btn--full" onClick={save} disabled={!valid} style={{ marginTop: 8 }}>Guardar alimento</button>
      </div>
    </div>
  )
}
