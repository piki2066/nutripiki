import { Icon } from '@/components/Icon'
import type { Food } from '@/db/types'
import { defaultServing, nutrientsForServing } from '@/db/repo'
import { fmtKcal, fmtNum } from '@/lib/format'

interface Props {
  food: Food
  onOpen: () => void
  onQuickAdd: () => void
}

/** Fila de resultado de búsqueda de alimento. */
export function FoodRow({ food, onOpen, onQuickAdd }: Props) {
  const sv = defaultServing(food)
  const n = nutrientsForServing(food, sv, 1)
  return (
    <div className="list-item list-item--tap" role="button" onClick={onOpen}>
      <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span className="list-item__title ellipsis">{food.name}</span>
          {food.verified && <Icon name="check-circle" size={14} color="var(--good)" style={{ flexShrink: 0 }} />}
        </div>
        <span className="list-item__sub ellipsis">
          {fmtKcal(n.calories)} kcal · {sv.label}
          {food.brand ? ` · ${food.brand}` : food.source === 'off' ? ' · OpenFoodFacts' : ''}
        </span>
        <span className="cap dim" style={{ fontSize: 11 }}>
          C {fmtNum(n.carbs)}g · P {fmtNum(n.protein)}g · G {fmtNum(n.fat)}g
        </span>
      </div>
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
