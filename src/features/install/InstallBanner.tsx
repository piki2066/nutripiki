import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { useInstall, promptInstall, isInstallBannerDismissed, dismissInstallBanner } from '@/lib/pwa'
import { useUI } from '@/lib/store'

/** Aviso discreto en Hoy para instalar la app. Se puede descartar (30 días). */
export function InstallBanner() {
  const nav = useNavigate()
  const { canPrompt, installed } = useInstall()
  const toast = useUI((s) => s.toast)
  const [hidden, setHidden] = useState(isInstallBannerDismissed)

  if (installed || hidden) return null

  async function action() {
    if (!canPrompt) return nav('/install')
    const r = await promptInstall()
    if (r === 'accepted') toast('¡Instalada! Ábrela desde el icono', { icon: 'check' })
    else nav('/install')
  }

  function close() {
    dismissInstallBanner()
    setHidden(true)
  }

  return (
    <div className="card row between" style={{ marginBottom: 14, gap: 12, border: '1px solid color-mix(in srgb, var(--brand) 40%, transparent)' }}>
      <button className="row gap-3" style={{ background: 'none', flex: 1, minWidth: 0, textAlign: 'left' }} onClick={action}>
        <div className="center-all" style={{ width: 40, height: 40, borderRadius: 11, background: 'color-mix(in srgb, var(--brand) 18%, transparent)', flexShrink: 0 }}>
          <Icon name="download" size={22} color="var(--brand)" />
        </div>
        <div className="col" style={{ alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
          <span className="h3">Instalar NutriPiki</span>
          <span className="cap dim ellipsis">{canPrompt ? 'Un toque y la tienes en tu pantalla de inicio' : 'Añádela a tu pantalla de inicio en 3 pasos'}</span>
        </div>
      </button>
      <button className="icon-btn" onClick={close} aria-label="Ahora no"><Icon name="close" size={18} color="var(--text-3)" /></button>
    </div>
  )
}
