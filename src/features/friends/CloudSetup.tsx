import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { setCloudConfig } from '@/lib/cloud'
import { useUI } from '@/lib/store'

const STEPS = [
  'Entra en supabase.com y crea un proyecto gratis (Region: Europe).',
  'Abre SQL Editor → New query, pega el archivo docs/supabase/schema.sql y pulsa Run.',
  'En Authentication → Sign In / Providers: activa "Allow anonymous sign-ins" y desactiva "Confirm email".',
  'En Project Settings → Data API copia la URL y la clave anon public, y pégalas aquí abajo.',
]

/** Pantalla previa: la nube de amigos aún no está conectada. */
export function CloudSetup() {
  const toast = useUI((s) => s.toast)
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')

  function save() {
    const u = url.trim().replace(/\/+$/, '')
    const k = key.trim()
    if (!/^https:\/\/.+\.supabase\.co$/.test(u)) return toast('La URL debe ser https://xxxx.supabase.co', { icon: 'info' })
    if (k.length < 30) return toast('La clave anon no parece correcta', { icon: 'info' })
    setCloudConfig({ url: u, anonKey: k })
    toast('Nube conectada', { icon: 'check' })
  }

  return (
    <div className="col gap-3">
      <div className="card card--glow col gap-3">
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <div className="center-all" style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--brand) 18%, transparent)', flexShrink: 0 }}>
            <Icon name="cloud" size={24} color="var(--brand)" />
          </div>
          <div className="col" style={{ alignItems: 'flex-start', gap: 2 }}>
            <span className="h3">Falta conectar la nube</span>
            <span className="cap dim">Los amigos son la única parte que necesita internet.</span>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
          <Icon name="lock" size={17} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="cap dim">
            A la nube solo sube el <b>resumen de cada día</b> (calorías, objetivo, ejercicio, pasos y peso).
            Tus alimentos, recetas, fotos y medidas siguen sin salir del móvil.
          </span>
        </div>
      </div>

      <div className="card col gap-3">
        <span className="h3">Cómo conectarla</span>
        <div className="col gap-3">
          {STEPS.map((t, i) => (
            <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
              <div className="center-all" style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--fill-2)', flexShrink: 0, fontWeight: 800, fontSize: 13 }}>{i + 1}</div>
              <span className="cap" style={{ flex: 1 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card col gap-3">
        <span className="h3">Pegar credenciales</span>
        <div className="field">
          <span className="label">URL del proyecto</span>
          <input className="input" placeholder="https://xxxxxxxx.supabase.co" value={url} autoCapitalize="none"
            autoCorrect="off" spellCheck={false} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Clave anon public</span>
          <input className="input" placeholder="eyJhbGciOi..." value={key} autoCapitalize="none"
            autoCorrect="off" spellCheck={false} onChange={(e) => setKey(e.target.value)} />
        </div>
        <button className="btn btn--grad btn--full" onClick={save}>
          <Icon name="cloud" size={18} /> Conectar
        </button>
        <span className="cap dim">
          La clave <i>anon</i> está pensada para ir en la app: quien la tenga solo puede ver lo que las reglas de
          seguridad permitan, es decir, lo suyo y lo de sus amigos.
        </span>
      </div>
    </div>
  )
}
