import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { signIn, signInAnonymous } from '@/lib/cloud'
import { useUI } from '@/lib/store'

/**
 * Entrar en Amigos. Por defecto SIN formularios: se crea una identidad
 * anónima en este dispositivo. El correo queda para recuperar la cuenta en
 * otro móvil, y es opcional.
 */
export function AuthPanel({ defaultName }: { defaultName?: string }) {
  const toast = useUI((s) => s.toast)
  const [busy, setBusy] = useState(false)
  const [withEmail, setWithEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function start() {
    setBusy(true); setErr(null)
    try {
      await signInAnonymous(defaultName ?? 'Amigo')
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  async function enter() {
    setBusy(true); setErr(null)
    try {
      await signIn(email, pass)
      toast('Sesión recuperada', { icon: 'check' })
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="col gap-3">
      <div className="card card--glow col gap-3">
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <div className="center-all" style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--brand) 18%, transparent)', flexShrink: 0 }}>
            <Icon name="users" size={24} color="var(--brand)" />
          </div>
          <div className="col" style={{ alignItems: 'flex-start', gap: 2 }}>
            <span className="h3">Amigos</span>
            <span className="cap dim">Su racha, sus calorías y su peso, al lado de los tuyos.</span>
          </div>
        </div>

        <button className="btn btn--grad btn--full" disabled={busy} onClick={start}>
          {busy ? 'Un momento…' : <>Empezar {defaultName ? `como ${defaultName.split(' ')[0]}` : ''}</>}
        </button>
        <span className="cap dim" style={{ textAlign: 'center' }}>
          Sin correo ni contraseña. Se crea tu identidad en este móvil y ya puedes invitar.
        </span>

        {err && (
          <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <Icon name="info" size={17} color="var(--bad)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span className="cap" style={{ color: 'var(--bad)' }}>{err}</span>
          </div>
        )}
      </div>

      {!withEmail ? (
        <button className="btn btn--ghost btn--full" onClick={() => setWithEmail(true)}>
          Ya tenía cuenta con correo
        </button>
      ) : (
        <div className="card col gap-3">
          <span className="h3">Recuperar mi cuenta</span>
          <div className="field">
            <span className="label">Correo</span>
            <input className="input" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
              placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Contraseña</span>
            <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <button className="btn btn--primary btn--full" disabled={busy || !email.includes('@') || pass.length < 6} onClick={enter}>
            Entrar
          </button>
        </div>
      )}
    </div>
  )
}
