import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/db/db'
import { sumNutrients } from './nutrition'
import { effectiveCalorieGoal, exerciseCalories, isEaten } from './selectors'
import { lastNDays, todayKey } from './date'

/**
 * Nube de AMIGOS (Supabase). Es la ÚNICA parte de NutriPiki que sale del
 * dispositivo, y solo sube RESÚMENES por día: calorías comidas, objetivo,
 * ejercicio, pasos, peso y si ese día hubo registro. Los alimentos concretos,
 * recetas, fotos y medidas se quedan siempre en local.
 *
 * El cliente de Supabase se carga con import() dinámico para no engordar el
 * arranque de quien no use amigos.
 */

/* ------------------------------- configuración --------------------------- */

export interface CloudConfig { url: string; anonKey: string }

const CFG_KEY = 'nutripiki.cloud.config'

export function getCloudConfig(): CloudConfig | null {
  // 1) Configuración compilada (variables VITE_ en el build)
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && anonKey) return { url, anonKey }
  // 2) Configuración pegada a mano en Ajustes (este dispositivo)
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CloudConfig
    return parsed.url && parsed.anonKey ? parsed : null
  } catch {
    return null
  }
}

export function setCloudConfig(cfg: CloudConfig | null) {
  try {
    if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
    else localStorage.removeItem(CFG_KEY)
  } catch { /* modo privado */ }
  clientPromise = null
  inited = false
  snapshot = { configured: !!getCloudConfig(), status: 'idle', user: null }
  listeners.forEach((l) => l())
  initCloud()
}

export function isCloudConfigured(): boolean {
  return !!getCloudConfig()
}

/* --------------------------------- estado -------------------------------- */

export interface CloudUser { id: string; email: string }
export type CloudStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CloudState {
  configured: boolean
  status: CloudStatus
  user: CloudUser | null
}

let snapshot: CloudState = { configured: isCloudConfigured(), status: 'idle', user: null }
const listeners = new Set<() => void>()

function publish(next: Partial<CloudState>) {
  const merged = { ...snapshot, ...next }
  if (merged.configured === snapshot.configured && merged.status === snapshot.status
    && merged.user?.id === snapshot.user?.id) return
  snapshot = merged
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  initCloud()
  return () => { listeners.delete(cb) }
}

export function useCloud(): CloudState {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

/* --------------------------------- cliente ------------------------------- */

let clientPromise: Promise<SupabaseClient> | null = null

export function getClient(): Promise<SupabaseClient> {
  const cfg = getCloudConfig()
  if (!cfg) return Promise.reject(new Error('CLOUD_NO_CONFIG'))
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      const c = createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'nutripiki.auth' },
      })
      c.auth.onAuthStateChange((_e, session) => {
        publish({ user: toUser(session), status: 'ready' })
      })
      return c
    })
  }
  return clientPromise
}

function toUser(session: { user?: { id: string; email?: string } } | null): CloudUser | null {
  if (!session?.user) return null
  return { id: session.user.id, email: session.user.email ?? '' }
}

let inited = false
export function initCloud() {
  if (inited) return
  if (!isCloudConfigured()) { publish({ configured: false, status: 'ready' }); return }
  inited = true
  publish({ configured: true, status: 'loading' })
  getClient()
    .then(async (c) => {
      const { data } = await c.auth.getSession()
      publish({ user: toUser(data.session), status: 'ready' })
    })
    .catch(() => publish({ status: 'error' }))
}

/* ---------------------------------- auth --------------------------------- */

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered')) return 'Ese correo ya está registrado. Inicia sesión.'
  if (m.includes('password') && m.includes('6')) return 'La contraseña necesita al menos 6 caracteres.'
  if (m.includes('email') && m.includes('confirm')) return 'Confirma tu correo antes de entrar (o desactiva la confirmación en Supabase).'
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un minuto.'
  return msg
}

export async function signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
  const c = await getClient()
  const { data, error } = await c.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() || 'Amigo' } },
  })
  if (error) throw new Error(friendlyAuthError(error.message))
  return { needsConfirmation: !data.session }
}

export async function signIn(email: string, password: string) {
  const c = await getClient()
  const { error } = await c.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(friendlyAuthError(error.message))
}

export async function signOut() {
  const c = await getClient()
  await c.auth.signOut()
  publish({ user: null })
}

/* --------------------------------- perfil -------------------------------- */

export interface CloudProfile {
  id: string
  display_name: string
  friend_code: string
  emoji: string
  last_seen: string
}

export async function myProfile(): Promise<CloudProfile | null> {
  const c = await getClient()
  const { data: auth } = await c.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await c.from('profiles').select('*').eq('id', auth.user.id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as CloudProfile) ?? null
}

export async function updateMyProfile(patch: { display_name?: string; emoji?: string }) {
  const c = await getClient()
  const { data: auth } = await c.auth.getUser()
  if (!auth.user) return
  const { error } = await c.from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', auth.user.id)
  if (error) throw new Error(error.message)
}

/* ------------------------------- resúmenes ------------------------------- */

export interface DailyStat {
  user_id?: string
  date: string
  kcal_eaten: number
  kcal_goal: number
  exercise_kcal: number
  exercise_min: number
  steps: number
  weight_kg: number | null
  logged: boolean
}

/** Construye el resumen (sin alimentos) de los días indicados desde Dexie. */
export async function collectStats(days: string[]): Promise<DailyStat[]> {
  const profile = await db.profile.get('me')
  if (!profile) return []
  const out: DailyStat[] = []
  for (const date of days) {
    const entries = await db.foodEntries.where('date').equals(date).toArray()
    const ex = await db.exerciseEntries.where('date').equals(date).toArray()
    const stp = await db.steps.get(date)
    const w = await db.weights.where('date').equals(date).toArray()
    out.push({
      date,
      kcal_eaten: Math.round(sumNutrients(entries.filter(isEaten).map((e) => e.nutrients)).calories),
      kcal_goal: effectiveCalorieGoal(profile, date),
      exercise_kcal: exerciseCalories(ex, stp?.caloriesBurned ?? 0),
      exercise_min: Math.round(ex.reduce((s, e) => s + (e.durationMin ?? 0), 0)),
      steps: stp?.steps ?? 0,
      weight_kg: w.length ? w[w.length - 1].weightKg : null,
      logged: entries.length > 0,
    })
  }
  return out
}

/** Sube a la nube el resumen de los últimos N días. Devuelve cuántos días subió. */
export async function pushStats(nDays = 30): Promise<number> {
  const c = await getClient()
  const { data: auth } = await c.auth.getUser()
  if (!auth.user) return 0
  const rows = await collectStats(lastNDays(nDays))
  if (!rows.length) return 0
  const payload = rows.map((r) => ({ ...r, user_id: auth.user!.id, updated_at: new Date().toISOString() }))
  const { error } = await c.from('daily_stats').upsert(payload, { onConflict: 'user_id,date' })
  if (error) throw new Error(error.message)
  await c.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', auth.user.id)
  return rows.length
}

/** Borra de la nube todos mis resúmenes (dejar de compartir). */
export async function wipeMyStats() {
  const c = await getClient()
  const { error } = await c.rpc('wipe_my_stats')
  if (error) throw new Error(error.message)
}

/* --------------------------------- amigos -------------------------------- */

export interface FriendRow {
  friend_id: string
  display_name: string
  emoji: string
  friend_code: string
  last_seen: string
}

export interface RequestRow {
  id: string
  requester?: string
  addressee?: string
  display_name: string
  emoji: string
  created_at: string
}

export async function fetchFriends(): Promise<FriendRow[]> {
  const c = await getClient()
  const { data, error } = await c.rpc('friends_overview')
  if (error) throw new Error(error.message)
  return (data ?? []) as FriendRow[]
}

export async function fetchPending(): Promise<RequestRow[]> {
  const c = await getClient()
  const { data, error } = await c.rpc('pending_requests')
  if (error) throw new Error(error.message)
  return (data ?? []) as RequestRow[]
}

export async function fetchSent(): Promise<RequestRow[]> {
  const c = await getClient()
  const { data, error } = await c.rpc('sent_requests')
  if (error) throw new Error(error.message)
  return (data ?? []) as RequestRow[]
}

export async function sendFriendRequest(code: string): Promise<{ display_name: string; status: string }> {
  const c = await getClient()
  const { data, error } = await c.rpc('send_friend_request', { code })
  if (error) {
    if (error.message.includes('CODIGO_NO_EXISTE')) throw new Error('Ese código no existe. Revísalo.')
    if (error.message.includes('ES_TU_CODIGO')) throw new Error('Ese es tu propio código.')
    throw new Error(error.message)
  }
  const row = (data as { display_name: string; status: string }[])?.[0]
  return row ?? { display_name: 'Amigo', status: 'pending' }
}

export async function acceptRequest(id: string) {
  const c = await getClient()
  const { error } = await c.from('friendships').update({ status: 'accepted' }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function rejectRequest(id: string) {
  const c = await getClient()
  const { error } = await c.from('friendships').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function removeFriend(friendId: string) {
  const c = await getClient()
  const { data: auth } = await c.auth.getUser()
  if (!auth.user) return
  const me = auth.user.id
  const { error } = await c.from('friendships').delete()
    .or(`and(requester.eq.${me},addressee.eq.${friendId}),and(requester.eq.${friendId},addressee.eq.${me})`)
  if (error) throw new Error(error.message)
}

/** Resúmenes diarios de varios amigos desde una fecha. */
export async function fetchFriendStats(ids: string[], fromDate: string): Promise<DailyStat[]> {
  if (!ids.length) return []
  const c = await getClient()
  const { data, error } = await c.from('daily_stats')
    .select('*').in('user_id', ids).gte('date', fromDate).order('date')
  if (error) throw new Error(error.message)
  return (data ?? []) as DailyStat[]
}

/** Sincroniza en segundo plano al abrir la app (silencioso si no procede). */
export async function autoSync() {
  try {
    if (!isCloudConfigured()) return
    const c = await getClient()
    const { data } = await c.auth.getSession()
    if (!data.session) return
    const settings = await db.settings.get('app')
    if (settings?.cloudShare === false) return
    await pushStats(30)
  } catch { /* sin conexión: se reintentará al abrir Amigos */ }
}

export { todayKey }
