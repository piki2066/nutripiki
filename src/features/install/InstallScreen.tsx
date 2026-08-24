import { AppHeader } from '@/components/AppHeader'
import { Icon, type IconName } from '@/components/Icon'
import { BrandEmblem, Wordmark } from '@/components/Wordmark'
import { InstallPanel } from './InstallPanel'
import { useInstall } from '@/lib/pwa'

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: 'phone', text: 'Icono propio en la pantalla de inicio, como cualquier app' },
  { icon: 'bolt', text: 'Se abre a pantalla completa y más rápido, sin barra del navegador' },
  { icon: 'lock', text: 'Tus datos quedan protegidos: el sistema deja de borrarlos por inactividad' },
  { icon: 'scan', text: 'Funciona sin internet y el escáner de códigos va igual de bien' },
]

export default function InstallScreen() {
  const { installed } = useInstall()
  return (
    <div className="screen">
      <AppHeader back title="Instalar app" />

      <div className="col" style={{ alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <BrandEmblem size={72} />
        <Wordmark size="md" />
        <span className="cap dim" style={{ textAlign: 'center', maxWidth: 300 }}>
          {installed ? 'Instalada en este dispositivo.' : 'Llévala en tu móvil como una app más.'}
        </span>
      </div>

      <InstallPanel />

      <div className="section-title">Por qué instalarla</div>
      <div className="card col gap-3">
        {BENEFITS.map((b) => (
          <div key={b.text} className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <Icon name={b.icon} size={18} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span className="cap">{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
