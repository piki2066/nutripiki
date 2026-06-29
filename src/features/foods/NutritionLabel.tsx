import type { Nutrients } from '@/db/types'
import { NUTRIENT_META } from '@/lib/nutrientMeta'
import { fmtNum } from '@/lib/format'

/** Tabla de información nutricional (estilo etiqueta), con sangrías por grupo. */
export function NutritionLabel({ nutrients }: { nutrients: Nutrients }) {
  return (
    <table className="nutri-table">
      <tbody>
        {NUTRIENT_META.map((m) => {
          const v = nutrients[m.key] ?? 0
          if ((m.key === 'addedSugar' || m.group === 'vitamin' || m.indent) && !v) {
            // ocultar nutrientes secundarios sin valor
            if (m.key !== 'calories') return null
          }
          const isMain = ['calories', 'carbs', 'fat', 'protein'].includes(m.key)
          return (
            <tr key={m.key} className={isMain ? 'bold' : ''}>
              <td className={m.indent ? 'ind' : ''} style={{ color: m.color }}>{m.label}</td>
              <td className="val">{fmtNum(v)} {m.unit}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
