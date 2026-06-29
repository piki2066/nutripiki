import { useUI } from '@/lib/store'
import { Icon } from './Icon'

export function Toaster() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismissToast)
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          {t.icon === 'check' && <Icon name="check-circle" size={18} color="var(--good)" />}
          {t.icon === 'info' && <Icon name="info" size={18} color="var(--brand)" />}
          {t.icon === 'undo' && <Icon name="undo" size={18} color="var(--text-2)" />}
          <span>{t.text}</span>
          {t.action && (
            <button
              className="t-cal"
              style={{ fontWeight: 800, marginLeft: 4 }}
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
