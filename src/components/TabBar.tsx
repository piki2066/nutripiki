import { useNavigate, useLocation } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { useUI } from '@/lib/store'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Hoy', icon: 'today' },
  { to: '/diary', label: 'Diario', icon: 'diary' },
  { to: '/progress', label: 'Progreso', icon: 'progress' },
  { to: '/more', label: 'Más', icon: 'more' },
]

export function TabBar() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const setQuickOpen = useUI((s) => s.setQuickOpen)

  const isOn = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  return (
    <nav className="tabbar">
      <div className="tabbar__inner">
        <button className={`tab ${isOn('/') ? 'on' : ''}`} onClick={() => nav('/')}>
          <Icon name="today" size={24} fill={isOn('/')} />
          <span>Hoy</span>
        </button>
        <button className={`tab ${isOn('/diary') ? 'on' : ''}`} onClick={() => nav('/diary')}>
          <Icon name="diary" size={24} />
          <span>Diario</span>
        </button>
        <button className="tab" onClick={() => setQuickOpen(true)} aria-label="Añadir">
          <span className="tab__plus">
            <Icon name="plus" size={26} strokeWidth={2.6} />
          </span>
        </button>
        <button className={`tab ${isOn('/progress') ? 'on' : ''}`} onClick={() => nav('/progress')}>
          <Icon name="progress" size={24} />
          <span>Progreso</span>
        </button>
        <button className={`tab ${isOn('/more') ? 'on' : ''}`} onClick={() => nav('/more')}>
          <Icon name="more" size={24} />
          <span>Más</span>
        </button>
      </div>
    </nav>
  )
}
