import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Segmented } from '@/components/ui'
import { signIn, signUp } from '@/lib/cloud'
import { useUI } from '@/lib/store'

/** Entrar o crear cuenta para el muro de amigos. */
export function AuthPanel({ defaultName }: { defaultName?: string }) {
  const toast = useUI((s) => s.toast)
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState(defaultName ?? '')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setErr(null)
    try {
      if (mode === 'up') {
        const { needsConfirmation } = await signUp(email, pass, name)
        if (needsConfirmation) {
          toast('Revisa tu correo para confirmar la cuenta', { icon: 'info' })
          setMode('in')
        } else {
          toast('Cuenta creada', { icon: 'check' })
        }
      } else {
        await signIn(email, pass)
        toast('Sesión iniciada', { icon: 'check' })
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = email.includes('@') && pass.length >= 6 && (mode === 'in' || name.trim().length > 0)

  return (
    <div className="col gap-3">
      <div className="card card--glow col gap-3">
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <div className="center-all" style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--brand) 18%, transparent)', flexShrink: 0 }}>
            <Icon name="users" size={24} color="var(--brand)" />
          </div>
          <div className="col" style={{ alignItems: 'flex-start', gap: 2 }}>
            <span className="h3">Amigos</span>
            <span className="cap dim">Comparte tu constancia y ve la de ellos.</span>
          </div>
        </div>
      </div>

      <div className="card col gap-3">
        <Segmented<'in' | 'up'>
          value={mode}
          onChange={(m) => { setMode(m); setErr(null) }}
          options={[{ value: 'in', label: 'Entrar' }, { value: 'up', label: 'Crear cuenta' }]}
        />
        {mode === 'up' && (
          <div className="field">
            <span className="label">Nombre que verán tus amigos</span>
            <input className="input" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <span className="label">Correo</span>
          <input className="input" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
            placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Contraseña</span>
          <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={pass}
            onChange={(e) => setPass(e.target.value)} />
        </div>
        {err && (
          <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <Icon name="info" size={17} color="var(--bad)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span className="cap" style={{ color: 'var(--bad)' }}>{err}</span>
          </div>
        )}
        <button className="btn btn--grad btn--full" disabled={!canSubmit || busy} onClick={submit}>
          {busy ? 'Un momento…' : mode === 'up' ? 'Crear cuenta' : 'Entrar'}
        </button>
        <span className="cap dim">
          El correo solo sirve para identificarte. Tu diario sigue en el móvil: a la nube va únicamente el
          resumen diario (calorías, ejercicio, pasos y peso) que ven tus amigos aceptados.
        </span>
      </div>
    </div>
  )
}
