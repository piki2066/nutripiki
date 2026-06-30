import { Icon } from '@/components/Icon'
import type { Food } from '@/db/types'
import { defaultServing, nutrientsForServing } from '@/db/repo'
import { fmtKcal, fmtNum } from '@/lib/format'

interface Props {
  food: Food
  onOpen: () => void
  onQuickAdd: () => void
  saved?: boolean
  onToggleSave?: () => void
  onDelete?: () => void
}

const NUTRI_COLORS: Record<string, string> = {
  a: '#1e8f4e', b: '#7ac547', c: '#e6b800', d: '#f08c00', e: '#e63312',
}

/** Sello Nutri-Score (A-E) con el color oficial. */
export function NutriScoreBadge({ grade }: { grade: string }) {
  const g = grade.toLowerCase()
  return (
    <span
      className="center-all"
      style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        background: NUTRI_COLORS[g] ?? 'var(--text-3)', color: '#fff',
        fontWeight: 800, fontSize: 11, lineHeight: 1,
      }}
      title={`Nutri-Score ${g.toUpperCase()}`}
    >
      {g.toUpperCase()}
    </span>
  )
}

/** Fila de resultado de búsqueda de alimento. */
export function FoodRow({ food, onOpen, onQuickAdd, saved, onToggleSave, onDelete }: Props) {
  const sv = defaultServing(food)
  const n = nutrientsForServing(food, sv, 1)
  return (
    <div className="list-item list-item--tap" role="button" onClick={onOpen}>
      <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
        <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
          <span className="list-item__title ellipsis">{food.name}</span>
          {food.verified && <Icon name="check-circle" size={14} color="var(--good)" style={{ flexShrink: 0 }} />}
          {food.nutriScore && <NutriScoreBadge grade={food.nutriScore} />}
          {food.nova === 4 && (
            <span className="cap" style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: 'var(--warn)', border: '1px solid var(--warn)', borderRadius: 4, padding: '0 4px' }} title="Ultraprocesado (NOVA 4)">UP</span>
          )}
        </div>
        <span className="list-item__sub ellipsis">
          {fmtKcal(n.calories)} kcal · {sv.label}
          {food.brand ? ` · ${food.brand}` : food.source === 'off' ? ' · OpenFoodFacts' : ''}
        </span>
        <span className="cap dim" style={{ fontSize: 11 }}>
          C {fmtNum(n.carbs)}g · P {fmtNum(n.protein)}g · G {fmtNum(n.fat)}g
        </span>
      </div>
      {onDelete && (
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onDelete() }} aria-label="Borrar alimento">
          <Icon name="trash" size={20} color="var(--text-3)" />
        </button>
      )}
      {onToggleSave && (
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onToggleSave() }} aria-label={saved ? 'Quitar de guardados' : 'Guardar'}>
          <Icon name="star" size={20} color={saved ? 'var(--brand)' : 'var(--text-3)'} fill={saved} />
        </button>
      )}
      <button
        className="icon-btn"
        style={{ background: 'color-mix(in srgb, var(--brand) 16%, transparent)', color: 'var(--brand)' }}
        onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
        aria-label="Añadir rápido"
      >
        <Icon name="plus" size={22} strokeWidth={2.5} />
      </button>
    </div>
  )
}
