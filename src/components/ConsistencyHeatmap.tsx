import { lastNDays, parseKey, todayKey } from '@/lib/date'

/**
 * Calendario de constancia tipo "GitHub": una celda por día de los últimos
 * `weeks` semanas; coloreada si ese día tiene registro. Motiva a no romper la cadena.
 */
export function ConsistencyHeatmap({ logged, weeks = 16 }: { logged: Set<string>; weeks?: number }) {
  const cell = 13
  const gap = 3
  const total = weeks * 7
  const dates = lastNDays(total)
  const today = todayKey()
  // Lunes = 0 ... Domingo = 6
  const firstWeekday = (parseKey(dates[0]).getDay() + 6) % 7
  const cols = Math.ceil((total + firstWeekday) / 7)
  const W = cols * (cell + gap)
  const H = 7 * (cell + gap)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Constancia de registro">
      {dates.map((d, i) => {
        const idx = i + firstWeekday
        const col = Math.floor(idx / 7)
        const row = idx % 7
        const on = logged.has(d)
        const isToday = d === today
        return (
          <rect
            key={d}
            x={col * (cell + gap)}
            y={row * (cell + gap)}
            width={cell}
            height={cell}
            rx={3}
            fill={on ? 'var(--brand)' : 'var(--fill)'}
            opacity={on ? 1 : 1}
            stroke={isToday ? 'var(--text-2)' : 'none'}
            strokeWidth={isToday ? 1.4 : 0}
          />
        )
      })}
    </svg>
  )
}
