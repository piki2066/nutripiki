import type { CSSProperties } from 'react'

export type IconName =
  | 'today' | 'diary' | 'progress' | 'more' | 'plus' | 'plus-circle'
  | 'search' | 'scan' | 'close' | 'check' | 'check-circle' | 'chevron-left'
  | 'chevron-right' | 'chevron-down' | 'flame' | 'trash' | 'edit' | 'camera'
  | 'clock' | 'target' | 'settings' | 'user' | 'scale' | 'ruler' | 'food'
  | 'copy' | 'star' | 'info' | 'sun' | 'moon' | 'dumbbell' | 'water' | 'steps'
  | 'fasting' | 'recipe' | 'meal' | 'calendar' | 'download' | 'chart' | 'note'
  | 'undo' | 'bell' | 'water-drop' | 'minus' | 'heart' | 'bolt' | 'list'
  | 'apple' | 'cutlery' | 'trophy' | 'share' | 'lock'

const P: Record<IconName, string> = {
  today: 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  diary: 'M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3zM5 17h14M9 7h6',
  progress: 'M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-8',
  more: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  'plus-circle': 'M12 8v8M8 12h8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  scan: 'M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 8v8M10 8v8M13 8v8M16 8v8',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 13l4 4L19 7',
  'check-circle': 'M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  flame: 'M12 3c0 3-4 4-4 8a4 4 0 0 0 8 0c0-1.5-1-2.5-1.5-3.5C13 9 14 6 12 3z',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  camera: 'M4 8a2 2 0 0 1 2-2h1.5l1-2h7l1 2H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.8 7.8 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.3-1c.5.4 1.1.8 1.7 1l.4 2.6h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.3 1 2-3.4z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  scale: 'M4 7h16l-2 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM9 7a3 3 0 0 1 6 0M12 11l-2 4h4z',
  ruler: 'M3 8l5-5 13 13-5 5zM8 7l2 2M11 4l2 2M5 10l2 2',
  food: 'M6 3v7a3 3 0 0 0 3 3v8M9 3v7M12 3v7M18 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9',
  cutlery: 'M6 3v7a3 3 0 0 0 3 3v8M9 3v7M12 3v7M18 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  star: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19l1-5.8L3.5 9.2l5.9-.9z',
  info: 'M12 11v5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  dumbbell: 'M6.5 6.5l11 11M3 9l3-3 3 3-3 3zM15 15l3-3 3 3-3 3zM2 12h2M20 12h2',
  water: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  'water-drop': 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  steps: 'M7 4c-1 2-1 5 0 7s1 4 0 5M16 6c1 2 1 4 0 6s-1 4 0 6M6 17h3M14 19h3',
  fasting: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  recipe: 'M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3zM9 7h6M9 11h6M9 15h4',
  meal: 'M3 11a9 9 0 0 1 18 0M2 11h20M5 15h14l-1.5 4a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z',
  calendar: 'M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 9h16M8 3v4M16 3v4',
  download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
  chart: 'M4 19V5M4 19h16M8 14l3-3 3 2 4-5',
  note: 'M5 3h11l3 3v15H5zM9 8h6M9 12h6M9 16h3',
  undo: 'M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-3',
  bell: 'M6 9a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7zM10 20a2 2 0 0 0 4 0',
  heart: 'M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  apple: 'M12 7c0-2 1.5-3.5 3.5-3.5M16 8c2 0 3.5 2 3.5 5s-2 7-4 7c-1 0-1.5-.5-3.5-.5S9.5 20 8.5 20c-2 0-4-4-4-7S6 8 8 8c1.2 0 2.5.6 4 .6S14.8 8 16 8z',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 20h6M12 13v4',
  share: 'M12 3v12M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z',
}

interface Props {
  name: IconName
  size?: number
  color?: string
  fill?: boolean
  strokeWidth?: number
  style?: CSSProperties
  className?: string
}

export function Icon({ name, size = 24, color = 'currentColor', fill = false, strokeWidth = 2, style, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? color : 'none'}
      stroke={fill ? 'none' : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  )
}
