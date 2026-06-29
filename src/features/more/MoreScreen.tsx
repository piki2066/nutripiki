import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Icon, type IconName } from '@/components/Icon'
import { ListRow } from '@/components/ui'
import { useProfile } from '@/hooks/useData'
import { fmtKcal } from '@/lib/format'

interface Item {
  icon: IconName
  title: string
  sub?: string
  to: string
}

const NUTRITION: Item[] = [
  { icon: 'target', title: 'Objetivos', sub: 'Calorías y macros', to: '/goals' },
  { icon: 'chart', title: 'Panel de nutrientes', sub: 'Reparto del día', to: '/nutrition' },
  { icon: 'progress', title: 'Reportes', sub: 'Tendencias y resúmenes', to: '/reports' },
]

const LOGGING: Item[] = [
  { icon: 'recipe', title: 'Mis recetas / Crear', sub: 'Crea una receta nueva', to: '/recipe/new' },
  { icon: 'download', title: 'Importar receta (URL)', sub: 'Desde una página web', to: '/recipe/import' },
  { icon: 'food', title: 'Crear alimento', sub: 'Añade un alimento propio', to: '/food/new' },
  { icon: 'dumbbell', title: 'Ejercicio', sub: 'Cardio y fuerza', to: '/exercise' },
  { icon: 'fasting', title: 'Ayuno intermitente', sub: 'Controla tus ventanas', to: '/fasting' },
]

const PROGRESS: Item[] = [
  { icon: 'scale', title: 'Peso', sub: 'Registra tu peso', to: '/weight' },
  { icon: 'ruler', title: 'Medidas', sub: 'Cintura, cadera y más', to: '/measurements' },
  { icon: 'camera', title: 'Fotos de progreso', sub: 'Compara tu evolución', to: '/photos' },
]

const APP: Item[] = [
  { icon: 'user', title: 'Perfil', sub: 'Tus datos personales', to: '/profile' },
  { icon: 'settings', title: 'Ajustes', sub: 'Tema, datos y privacidad', to: '/settings' },
]

export default function MoreScreen() {
  const nav = useNavigate()
  const profile = useProfile()

  const name = profile?.name?.trim() || 'Tu perfil'
  const initial = (profile?.name?.trim()?.[0] ?? '?').toUpperCase()

  return (
    <div className="screen">
      <AppHeader title="Más" />

      {/* Cabecera de perfil */}
      <button
        className="card card--tap row between"
        style={{ marginBottom: 6, width: '100%' }}
        onClick={() => nav('/profile')}
      >
        <div className="row gap-3" style={{ minWidth: 0 }}>
          <div
            className="center-all"
            style={{ width: 52, height: 52, borderRadius: 999, background: 'var(--brand)', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}
          >
            {initial}
          </div>
          <div className="col" style={{ alignItems: 'flex-start', minWidth: 0 }}>
            <span className="h2 ellipsis">{name}</span>
            <span className="cap dim">
              {profile ? `${fmtKcal(profile.calorieGoal)} kcal · objetivo diario` : 'Toca para configurar'}
            </span>
          </div>
        </div>
        <Icon name="chevron-right" size={22} color="var(--text-3)" />
      </button>

      <Group title="Nutrición" items={NUTRITION} onNav={(to) => nav(to)} />
      <Group title="Registro" items={LOGGING} onNav={(to) => nav(to)} />
      <Group title="Progreso" items={PROGRESS} onNav={(to) => nav(to)} />
      <Group title="App" items={APP} onNav={(to) => nav(to)} />
    </div>
  )
}

function Group({ title, items, onNav }: { title: string; items: Item[]; onNav: (to: string) => void }) {
  return (
    <>
      <div className="section-title">{title}</div>
      <div className="list">
        {items.map((it) => (
          <ListRow key={it.to} icon={it.icon} title={it.title} sub={it.sub} onClick={() => onNav(it.to)} />
        ))}
      </div>
    </>
  )
}
