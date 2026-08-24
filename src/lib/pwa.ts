import { useSyncExternalStore } from 'react'

/**
 * Instalación de la PWA (añadir a la pantalla de inicio).
 *
 * Chrome/Edge (Android y escritorio) disparan `beforeinstallprompt`: lo
 * guardamos para poder ofrecer un botón "Instalar app" de verdad.
 * Safari/iOS NO lo soporta: allí solo se puede guiar al usuario por el menú
 * Compartir → Añadir a pantalla de inicio.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Platform = 'ios-safari' | 'ios-other' | 'android' | 'desktop'

export interface InstallState {
  /** Hay un evento nativo guardado: podemos instalar con un botón. */
  canPrompt: boolean
  /** La app se está ejecutando ya instalada (desde el icono). */
  installed: boolean
  platform: Platform
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  // iPadOS 13+ se identifica como Mac: se distingue por el táctil.
  const isIOS = /iPad|iPhone|iPod/.test(ua)
    || (ua.includes('Macintosh') && (navigator.maxTouchPoints ?? 0) > 1)
  if (isIOS) {
    // En iOS todos los navegadores usan WebKit, pero solo Safari instala PWAs
    // con almacenamiento persistente fiable.
    return /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/.test(ua) ? 'ios-other' : 'ios-safari'
  }
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mm = (q: string) => window.matchMedia?.(q).matches ?? false
  return mm('(display-mode: standalone)')
    || mm('(display-mode: fullscreen)')
    || mm('(display-mode: minimal-ui)')
    // iOS Safari (propiedad no estándar)
    || (navigator as unknown as { standalone?: boolean }).standalone === true
    || document.referrer.startsWith('android-app://')
}

const PLATFORM = detectPlatform()
let deferred: BeforeInstallPromptEvent | null = null
let snapshot: InstallState = { canPrompt: false, installed: isStandalone(), platform: PLATFORM }
const listeners = new Set<() => void>()

function publish(next: Partial<InstallState>) {
  const merged = { ...snapshot, ...next }
  if (merged.canPrompt === snapshot.canPrompt && merged.installed === snapshot.installed) return
  snapshot = merged
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // impide el mini-infobar y nos deja lanzarlo cuando queramos
    deferred = e as BeforeInstallPromptEvent
    publish({ canPrompt: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    publish({ canPrompt: false, installed: true })
  })
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', () => {
    publish({ installed: isStandalone() })
  })
}

/** Lanza el diálogo nativo de instalación. Devuelve qué eligió el usuario. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred
  if (!e) return 'unavailable'
  // El evento solo se puede usar una vez.
  deferred = null
  publish({ canPrompt: false })
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    if (outcome === 'accepted') publish({ installed: true })
    return outcome
  } catch {
    return 'dismissed'
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useInstall(): InstallState {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

/* ---- Aviso de instalación en Hoy: recordar que se descartó ---- */

const DISMISS_KEY = 'nutripiki.installBanner.dismissedAt'
const DISMISS_DAYS = 30

export function isInstallBannerDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function dismissInstallBanner() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* modo privado */ }
}
