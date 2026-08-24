import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { Stat } from '@/components/ui'
import { BarChart, LineChart, type Point } from '@/components/Charts'
import { useProfile } from '@/hooks/useData'
import { useUI } from '@/lib/store'
import { fmtKcal, fmtNum, fmtSigned } from '@/lib/format'
import { kgToDisplay, weightUnit } from '@/lib/units'
import { lastNDays, parseKey, todayKey, format } from '@/lib/date'
import {
  useCloud, myProfile, fetchFriends, fetchFriendStats, addFriend, regenerateCode,
  removeFriend, pushStats, collectStats, signOut, linkAccount,
  inviteUrl, peekInvite, clearInvite,
  type CloudProfile, type CloudUser, type DailyStat, type FriendRow,
} from '@/lib/cloud'
import { CloudSetup } from './CloudSetup'
import { AuthPanel } from './AuthPanel'
import { buildMember, membersFromCloud, rankMembers, type Member } from './members'
import type { Units } from '@/db/types'

export default function FriendsScreen() {
  const { configured, status, user } = useCloud()
  const profile = useProfile()

  return (
    <div className="screen">
      <AppHeader back title="Amigos" />
      {!configured ? <CloudSetup />
        : status === 'loading' ? <div className="center-all" style={{ padding: 40 }}><div className="skeleton" style={{ width: 64, height: 64, borderRadius: 18 }} /></div>
          : !user ? <AuthPanel defaultName={profile?.name} />
            : <FriendsHome user={user} units={profile?.units ?? 'metric'} startsMonday={profile?.weeklyStartsMonday ?? true} />}
    </div>
  )
}

function FriendsHome({ user, units, startsMonday }: { user: CloudUser; units: Units; startsMonday: boolean }) {
  const toast = useUI((s) => s.toast)
  const today = todayKey()

  const [me, setMe] = useState<CloudProfile | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState<Member | null>(null)
  const [showCode, setShowCode] = useState(false)

  const load = useCallback(async (push: boolean) => {
    setBusy(true); setErr(null)
    try {
      // Si se ha abierto la app desde un enlace de invitación, se aplica ya.
      const invite = peekInvite()
      if (invite) {
        clearInvite()
        try {
          const r = await addFriend(invite)
          toast(`¡Ya sois amigos, ${r.display_name}!`, { icon: 'check' })
        } catch (e) {
          toast((e as Error).message, { icon: 'info' })
        }
      }
      if (push) await pushStats(30)
      const [prof, friends] = await Promise.all([myProfile(), fetchFriends()])
      setMe(prof)

      const ids = friends.map((f: FriendRow) => f.friend_id)
      const stats: DailyStat[] = ids.length ? await fetchFriendStats(ids, lastNDays(30)[0]) : []
      const mine = await collectStats(lastNDays(30))
      const mineMember = buildMember(
        { id: 'me', name: prof?.display_name ?? 'Tú', emoji: prof?.emoji ?? '🥑', isMe: true },
        mine, today, startsMonday,
      )
      setMembers(rankMembers([mineMember, ...membersFromCloud(friends, stats, today, startsMonday)]))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [today, startsMonday, toast])

  useEffect(() => { load(true) }, [load])

  async function invite() {
    if (!me) return
    const url = inviteUrl(me.friend_code)
    const text = `Llevo mis comidas con NutriPiki. Ábrelo y nos vemos la racha:\n${url}`
    try {
      if (navigator.share) await navigator.share({ title: 'NutriPiki', text })
      else { await navigator.clipboard.writeText(text); toast('Enlace copiado, pégalo donde quieras', { icon: 'check' }) }
    } catch { /* cancelado */ }
  }

  async function add() {
    const c = code.trim().toUpperCase()
    if (c.length < 4) return toast('Escribe el código de tu amigo', { icon: 'info' })
    try {
      const r = await addFriend(c)
      setCode('')
      toast(`¡Ya sois amigos, ${r.display_name}!`, { icon: 'check' })
      load(false)
    } catch (e) {
      toast((e as Error).message, { icon: 'info' })
    }
  }

  return (
    <>
      {/* Invitar */}
      <div className="card card--glow col gap-3" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}>
            <span className="h3">Invita a quien quieras</span>
            <span className="cap dim">Le mandas un enlace y, al abrirlo, ya estáis conectados.</span>
          </div>
          <button className="icon-btn" onClick={() => load(true)} aria-label="Actualizar" disabled={busy}>
            <Icon name="refresh" size={20} color={busy ? 'var(--text-3)' : 'var(--brand)'} />
          </button>
        </div>
        <button className="btn btn--grad btn--full" onClick={invite} disabled={!me}>
          <Icon name="share" size={19} /> Invitar a un amigo
        </button>

        {!showCode ? (
          <button className="cap dim" style={{ background: 'none', textAlign: 'center' }} onClick={() => setShowCode(true)}>
            ¿Te han dado un código? Tócame
          </button>
        ) : (
          <div className="col gap-2" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
            <div className="row gap-2">
              <input className="input" placeholder="Código del amigo" value={code} autoCapitalize="characters"
                autoCorrect="off" spellCheck={false} style={{ flex: 1 }}
                onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button className="btn btn--primary" onClick={add}><Icon name="plus" size={18} /> Añadir</button>
            </div>
            <div className="row between" style={{ alignItems: 'center' }}>
              <span className="cap dim">El tuyo es <b className="tabnum" style={{ letterSpacing: '0.1em' }}>{me?.friend_code ?? '······'}</b></span>
              <button className="cap t-cal" style={{ fontWeight: 700, background: 'none' }} onClick={async () => {
                try { await regenerateCode(); await load(false); toast('Código nuevo: los enlaces viejos ya no valen', { icon: 'check' }) }
                catch (e) { toast((e as Error).message, { icon: 'info' }) }
              }}>Cambiar código</button>
            </div>
          </div>
        )}
      </div>

      {err && (
        <div className="card row gap-2" style={{ marginBottom: 14, alignItems: 'flex-start', border: '1px solid color-mix(in srgb, var(--bad) 40%, transparent)' }}>
          <Icon name="info" size={17} color="var(--bad)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="cap" style={{ color: 'var(--bad)' }}>{err}</span>
        </div>
      )}

      {/* Muro */}
      <div className="section-title">Esta semana</div>
      {busy && members.length === 0 ? (
        <div className="col gap-2">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />)}</div>
      ) : (
        <div className="col gap-2">
          {members.map((m, i) => (
            <MemberCard key={m.id} m={m} pos={i + 1} units={units} onOpen={() => setOpen(m)} />
          ))}
        </div>
      )}

      {members.length <= 1 && !busy && (
        <div className="card col gap-2" style={{ marginTop: 12, alignItems: 'center', textAlign: 'center' }}>
          <Icon name="users" size={28} color="var(--text-3)" />
          <span className="h3">Todavía estás solo aquí</span>
          <span className="cap dim">Manda el enlace por WhatsApp: quien lo abra entra en la app y aparece en esta lista sin más pasos.</span>
        </div>
      )}

      {user.anonymous && <ProtectAccount />}

      <button className="btn btn--soft btn--full" style={{ marginTop: 16 }} onClick={async () => { await signOut(); toast('Sesión cerrada', { icon: 'info' }) }}>
        <Icon name="logout" size={18} /> Cerrar sesión
      </button>

      <MemberDetail m={open} units={units} onClose={() => setOpen(null)} onRemove={async (id) => {
        await removeFriend(id); setOpen(null); toast('Amigo eliminado', { icon: 'info' }); load(false)
      }} />
    </>
  )
}

/** Aviso suave: la identidad anónima vive solo en este móvil. */
function ProtectAccount() {
  const toast = useUI((s) => s.toast)
  const [openForm, setOpenForm] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)

  if (!openForm) {
    return (
      <button className="card card--tap row gap-3" style={{ marginTop: 14, width: '100%', textAlign: 'left', alignItems: 'flex-start' }} onClick={() => setOpenForm(true)}>
        <Icon name="lock" size={18} color="var(--warn)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span className="cap">
          <b>Guarda tu cuenta.</b> Ahora vive solo en este móvil: si borras la app, pierdes a tus amigos.
          Ponle un correo y una contraseña (30 segundos).
        </span>
      </button>
    )
  }

  return (
    <div className="card col gap-3" style={{ marginTop: 14 }}>
      <span className="h3">Guardar mi cuenta</span>
      <div className="field">
        <span className="label">Correo</span>
        <input className="input" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">Contraseña</span>
        <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={pass}
          onChange={(e) => setPass(e.target.value)} />
      </div>
      <div className="row gap-2">
        <button className="btn btn--soft btn--full" onClick={() => setOpenForm(false)}>Ahora no</button>
        <button className="btn btn--grad btn--full" disabled={busy || !email.includes('@') || pass.length < 6}
          onClick={async () => {
            setBusy(true)
            try { await linkAccount(email, pass); toast('Cuenta guardada', { icon: 'check' }) }
            catch (e) { toast((e as Error).message, { icon: 'info' }) }
            finally { setBusy(false) }
          }}>Guardar</button>
      </div>
    </div>
  )
}

/* --------------------------------- tarjeta -------------------------------- */

function MemberCard({ m, pos, units, onOpen }: { m: Member; pos: number; units: Units; onOpen: () => void }) {
  const pct = m.weekGoal > 0 ? Math.min(100, (m.weekEaten / m.weekGoal) * 100) : 0
  const over = m.weekEaten > m.weekGoal && m.weekGoal > 0
  const spark: Point[] = m.daily.slice(-14).map((d) => ({
    label: format(parseKey(d.date), 'd'),
    value: d.logged ? d.kcal_eaten : null,
  }))
  const active = m.isMe ? 'Tú' : m.lastSeen ? `Activo ${formatDistanceToNow(new Date(m.lastSeen), { addSuffix: true, locale: es })}` : 'Sin actividad'

  return (
    <button className="card card--tap col gap-2" style={{ alignItems: 'stretch', textAlign: 'left', width: '100%' }} onClick={onOpen}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
          <div className="center-all" style={{ width: 42, height: 42, borderRadius: 999, background: 'var(--fill-2)', flexShrink: 0, fontSize: 22, position: 'relative' }}>
            {m.emoji}
            {pos <= 3 && (
              <span className="center-all tabnum" style={{
                position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: 999,
                background: pos === 1 ? 'var(--brand)' : 'var(--fill)', color: pos === 1 ? '#fff' : 'var(--text-2)',
                fontSize: 10, fontWeight: 800, border: '2px solid var(--card)',
              }}>{pos}</span>
            )}
          </div>
          <div className="col" style={{ alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
            <span className="h3 ellipsis">{m.name}{m.isMe ? ' · tú' : ''}</span>
            <span className="cap dim ellipsis">{active}</span>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center', flexShrink: 0 }}>
          {m.streak > 0 && (
            <span className="badge" style={{ background: 'color-mix(in srgb, var(--warn) 18%, transparent)', color: 'var(--warn)' }}>
              <Icon name="flame" size={13} fill color="var(--warn)" /> {m.streak}
            </span>
          )}
          <Icon name="chevron-right" size={18} color="var(--text-3)" />
        </div>
      </div>

      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <span className="tabnum" style={{ fontWeight: 800, fontSize: 15, color: over ? 'var(--bad)' : 'var(--text)' }}>
          {fmtKcal(m.weekEaten)} <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>de {fmtKcal(m.weekGoal)} kcal</span>
        </span>
        <span className="cap dim tabnum">{m.weekLoggedDays}/7 días</span>
      </div>
      <div className="macro-bar"><span style={{ width: `${pct}%`, background: over ? 'var(--bad)' : 'var(--brand)' }} /></div>

      <div className="row between" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 8 }}>
        <MiniStat icon="dumbbell" color="var(--brand-2)" text={m.weekExKcal > 0 ? `${fmtKcal(m.weekExKcal)} kcal · ${m.weekExMin} min` : 'Sin deporte'} />
        <MiniStat icon="scale" color="var(--protein)"
          text={m.weightKg != null
            ? `${fmtNum(kgToDisplay(m.weightKg, units))} ${weightUnit(units)}${m.weightDelta != null ? ` (${fmtSigned(kgToDisplay(m.weightDelta, units))})` : ''}`
            : 'Sin peso'} />
      </div>

      {spark.filter((p) => p.value != null).length >= 2 && (
        <LineChart data={spark} height={78} color="var(--brand)" />
      )}
    </button>
  )
}

function MiniStat({ icon, color, text }: { icon: 'dumbbell' | 'scale'; color: string; text: string }) {
  return (
    <span className="cap" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-2)' }}>
      <Icon name={icon} size={14} color={color} /> {text}
    </span>
  )
}

/* --------------------------------- detalle -------------------------------- */

function MemberDetail({ m, units, onClose, onRemove }: {
  m: Member | null; units: Units; onClose: () => void; onRemove: (id: string) => void
}) {
  if (!m) return null
  const kcal: Point[] = m.daily.slice(-14).map((d) => ({ label: format(parseKey(d.date), 'EEEEE', { locale: es }), value: d.kcal_eaten }))
  const goalAvg = m.daily.length ? Math.round(m.daily.reduce((s, d) => s + d.kcal_goal, 0) / m.daily.length) : 0
  const weightPts: Point[] = m.daily.filter((d) => d.weight_kg != null)
    .map((d) => ({ label: format(parseKey(d.date), 'd/M'), value: kgToDisplay(Number(d.weight_kg), units) }))
  const adherence = m.daily.filter((d) => d.logged).length

  return (
    <Sheet open={!!m} onClose={onClose} title={`${m.emoji} ${m.name}`}>
      <div className="col gap-3" style={{ paddingBottom: 12 }}>
        <div className="row between">
          <Stat label="Racha" value={`${m.streak}`} accent="var(--warn)" />
          <Stat label="Días (30)" value={`${adherence}`} accent="var(--brand-2)" />
          <Stat label="Semana" value={fmtKcal(m.weekEaten)} accent="var(--cal)" />
        </div>

        <div className="col gap-1">
          <span className="label" style={{ margin: 0 }}>Calorías · últimos 14 días</span>
          {kcal.length >= 2
            ? <BarChart data={kcal} goal={goalAvg} height={150} color="var(--brand)" />
            : <span className="cap dim">Todavía no hay suficientes datos.</span>}
        </div>

        {weightPts.length >= 2 && (
          <div className="col gap-1">
            <span className="label" style={{ margin: 0 }}>Peso ({weightUnit(units)})</span>
            <LineChart data={weightPts} height={140} color="var(--protein)" />
          </div>
        )}

        <div className="row between" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
          <span className="cap dim">Ejercicio de la semana</span>
          <span className="cap tabnum" style={{ fontWeight: 700 }}>{fmtKcal(m.weekExKcal)} kcal · {m.weekExMin} min</span>
        </div>

        {!m.isMe && (
          <button className="btn btn--danger btn--full" onClick={() => onRemove(m.id)}>
            <Icon name="trash" size={18} /> Eliminar amigo
          </button>
        )}
      </div>
    </Sheet>
  )
}
