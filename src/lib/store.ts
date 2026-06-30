import { create } from 'zustand'
import { todayKey } from './date'
import { uid } from './id'

export interface Toast {
  id: string
  text: string
  icon?: 'check' | 'info' | 'undo'
  action?: { label: string; run: () => void }
}

interface UIState {
  currentDate: string
  setCurrentDate: (d: string) => void
  copiedDate: string | null // día "copiado" para pegar sus comidas en otro
  setCopiedDate: (d: string | null) => void
  quickOpen: boolean
  setQuickOpen: (v: boolean) => void
  toasts: Toast[]
  toast: (text: string, opts?: Omit<Toast, 'id' | 'text'>) => void
  dismissToast: (id: string) => void
}

export const useUI = create<UIState>((set, get) => ({
  currentDate: todayKey(),
  setCurrentDate: (d) => set({ currentDate: d }),
  copiedDate: null,
  setCopiedDate: (d) => set({ copiedDate: d }),
  quickOpen: false,
  setQuickOpen: (v) => set({ quickOpen: v }),
  toasts: [],
  toast: (text, opts) => {
    const id = uid('t')
    set({ toasts: [...get().toasts, { id, text, ...opts }] })
    setTimeout(() => get().dismissToast(id), opts?.action ? 5000 : 2600)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
