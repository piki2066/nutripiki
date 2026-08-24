import { useState } from 'react'
import { Icon, type IconName } from '@/components/Icon'
import { useInstall, promptInstall, isStandalone } from '@/lib/pwa'
import { useUI } from '@/lib/store'

/**
 * Panel reutilizable "Instalar app": botón nativo donde el navegador lo
 * permite (Android/escritorio) y pasos guiados donde no (iPhone/iPad).
 * Se usa en el onboarding y en la pantalla /install.
 */
export function InstallPanel({ onDone }: { onDone?: () => void }) {
  const { canPrompt, installed, platform } = useInstall()
  const toast = useUI((s) => s.toast)
  const [dismissed, setDismissed] = useState(false)

  async function install() {
    const r = await promptInstall()
    if (r === 'accepted') {
      toast('¡Instalada! Ábrela desde el icono', { icon: 'check' })
      onDone?.()
    } else if (r === 'dismissed') {
      setDismissed(true)
    } else {
      toast('Tu navegador no permite instalar desde aquí', { icon: 'info' })
    }
  }

  if (installed) {
    const running = isStandalone()
    return (
      <div className="card card--glow col gap-3">
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <div className="center-all" style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--good) 18%, transparent)', flexShrink: 0 }}>
            <Icon name="check-circle" size={24} color="var(--good)" />
          </div>
          <div className="col" style={{ alignItems: 'flex-start', gap: 2 }}>
            <span className="h3">NutriPiki ya está instalada</span>
            <span className="cap dim">{running ? 'La estás usando desde el icono. Perfecto.' : 'Ábrela desde el icono de tu pantalla de inicio.'}</span>
          </div>
        </div>
        <OriginWarning />
      </div>
    )
  }

  return (
    <div className="col gap-3">
      {canPrompt && (
        <div className="card card--glow col gap-3">
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">Instálala en un toque</span>
            <span className="cap dim">Se añade el icono a tu pantalla de inicio y se abre a pantalla completa, sin barra del navegador.</span>
          </div>
          <button className="btn btn--grad btn--full" onClick={install}>
            <Icon name="download" size={20} /> Instalar app
          </button>
          {dismissed && (
            <span className="cap dim">Has cancelado la instalación. Recarga la página si quieres volver a intentarlo, o usa los pasos manuales de abajo.</span>
          )}
        </div>
      )}

      {!canPrompt && platform === 'ios-other' && <OpenInSafari />}

      {!canPrompt && (platform === 'ios-safari' || platform === 'ios-other') && (
        <Steps
          title="Cómo instalarla en tu iPhone"
          sub="iOS no permite el botón automático: son 3 toques."
          steps={[
            { icon: 'share', title: 'Toca Compartir', sub: 'El icono del cuadrado con la flecha hacia arriba, abajo en la barra de Safari.' },
            { icon: 'plus-circle', title: 'Añadir a pantalla de inicio', sub: 'Baja por la lista de opciones hasta encontrarlo.' },
            { icon: 'check', title: 'Toca Añadir', sub: 'Arriba a la derecha. Ya tienes el icono de NutriPiki en tu móvil.' },
          ]}
        />
      )}

      {!canPrompt && platform === 'android' && (
        <Steps
          title="Cómo instalarla en tu Android"
          sub="Si no te sale el botón automático, hazlo desde el menú."
          steps={[
            { icon: 'dots-vertical', title: 'Abre el menú del navegador', sub: 'Los tres puntos, arriba a la derecha en Chrome.' },
            { icon: 'download', title: 'Instalar aplicación', sub: 'También puede aparecer como "Añadir a pantalla de inicio".' },
            { icon: 'check', title: 'Confirma', sub: 'Ya tienes el icono de NutriPiki en tu móvil.' },
          ]}
        />
      )}

      {!canPrompt && platform === 'desktop' && (
        <Steps
          title="Cómo instalarla en el ordenador"
          sub="En Chrome, Edge o Brave."
          steps={[
            { icon: 'download', title: 'Icono de instalar', sub: 'A la derecha de la barra de direcciones (una pantalla con una flecha).' },
            { icon: 'dots-vertical', title: 'O desde el menú', sub: 'Menú del navegador → Instalar NutriPiki.' },
            { icon: 'check', title: 'Confirma', sub: 'Se abrirá en su propia ventana, como una app.' },
          ]}
        />
      )}

      <OriginWarning />
    </div>
  )
}

function OpenInSafari() {
  const toast = useUI((s) => s.toast)
  async function copy() {
    try {
      await navigator.clipboard.writeText(location.href)
      toast('Enlace copiado. Pégalo en Safari', { icon: 'check' })
    } catch {
      toast('Copia el enlace desde la barra de direcciones', { icon: 'info' })
    }
  }
  return (
    <div className="card col gap-3" style={{ border: '1px solid color-mix(in srgb, var(--warn) 45%, transparent)' }}>
      <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
        <Icon name="info" size={18} color="var(--warn)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span className="cap">
          <b>Ábrela en Safari para instalarla.</b> En iPhone, cada navegador guarda sus propios datos: si la instalas desde Chrome, tu diario no será el mismo.
        </span>
      </div>
      <button className="btn btn--soft btn--full" onClick={copy}>
        <Icon name="copy" size={18} /> Copiar enlace para Safari
      </button>
    </div>
  )
}

function OriginWarning() {
  return (
    <div className="row gap-2" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
      <Icon name="lock" size={17} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
      <span className="cap dim">
        Tus datos se guardan <b>solo en este dispositivo</b> y van ligados a cómo abres la app.
        Usa siempre el mismo sitio (el icono instalado) y haz de vez en cuando una copia desde <b>Ajustes → Exportar datos</b>.
      </span>
    </div>
  )
}

interface StepItem { icon: IconName; title: string; sub: string }

function Steps({ title, sub, steps }: { title: string; sub: string; steps: StepItem[] }) {
  return (
    <div className="card col gap-3">
      <div className="col" style={{ gap: 3 }}>
        <span className="h3">{title}</span>
        <span className="cap dim">{sub}</span>
      </div>
      <div className="col gap-3">
        {steps.map((s, i) => (
          <div key={s.title} className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <div className="center-all" style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--fill-2)', flexShrink: 0, fontWeight: 800, fontSize: 14 }}>
              {i + 1}
            </div>
            <div className="col" style={{ alignItems: 'flex-start', gap: 1, flex: 1, minWidth: 0 }}>
              <span className="row gap-2" style={{ alignItems: 'center', fontWeight: 700, fontSize: 15 }}>
                <Icon name={s.icon} size={17} color="var(--brand)" /> {s.title}
              </span>
              <span className="cap dim">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
