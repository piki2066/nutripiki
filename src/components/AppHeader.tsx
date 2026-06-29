import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

interface Props {
  title?: ReactNode
  back?: boolean
  onBack?: () => void
  leading?: ReactNode
  trailing?: ReactNode
  center?: ReactNode
}

export function AppHeader({ title, back, onBack, leading, trailing, center }: Props) {
  const nav = useNavigate()
  return (
    <header className="appbar">
      <div className="appbar__inner">
        {back ? (
          <button className="icon-btn" onClick={() => (onBack ? onBack() : nav(-1))} aria-label="Atrás">
            <Icon name="chevron-left" size={26} />
          </button>
        ) : (
          leading ?? <div style={{ width: 8 }} />
        )}
        {center ?? <div className="appbar__title ellipsis" style={{ flex: 1 }}>{title}</div>}
        <div style={{ marginLeft: 'auto' }} className="row gap-1">{trailing}</div>
      </div>
    </header>
  )
}
