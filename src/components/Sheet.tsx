import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  full?: boolean
  trailing?: ReactNode
}

/** Hoja inferior (bottom sheet) modal con backdrop. */
export function Sheet({ open, onClose, title, children, full, trailing }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div className={`sheet ${full ? 'sheet--full' : ''}`} role="dialog" aria-modal="true">
        {!full && <div className="sheet__grip" />}
        {(title || full) && (
          <div className="sheet__header">
            {full ? (
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                <Icon name="close" size={24} />
              </button>
            ) : (
              <div className="h3">{title}</div>
            )}
            {full && <div className="h3" style={{ flex: 1, textAlign: 'center' }}>{title}</div>}
            <div>{trailing ?? (full ? <div style={{ width: 40 }} /> : null)}</div>
          </div>
        )}
        {children}
      </div>
    </>,
    document.body,
  )
}
