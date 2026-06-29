import {
  format, addDays, subDays, parseISO, isToday, isYesterday,
  startOfWeek, endOfWeek, eachDayOfInterval, differenceInCalendarDays,
} from 'date-fns'
import { es } from 'date-fns/locale'

/** Fecha de hoy en formato yyyy-MM-dd (clave del diario). */
export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function parseKey(key: string): Date {
  return parseISO(key)
}

export function shiftKey(key: string, days: number): string {
  return dateKey(addDays(parseKey(key), days))
}

/** Etiqueta amable: "Hoy", "Ayer" o "lun, 9 jun". */
export function friendlyDate(key: string): string {
  const d = parseKey(key)
  if (isToday(d)) return 'Hoy'
  if (isYesterday(d)) return 'Ayer'
  return format(d, "EEE, d MMM", { locale: es })
}

export function longDate(key: string): string {
  return format(parseKey(key), "EEEE, d 'de' MMMM", { locale: es })
}

export function weekRange(key: string, startsMonday = true): string[] {
  const d = parseKey(key)
  const start = startOfWeek(d, { weekStartsOn: startsMonday ? 1 : 0 })
  const end = endOfWeek(d, { weekStartsOn: startsMonday ? 1 : 0 })
  return eachDayOfInterval({ start, end }).map(dateKey)
}

export function lastNDays(n: number, endKey = todayKey()): string[] {
  const end = parseKey(endKey)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(dateKey(subDays(end, i)))
  return out
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(differenceInCalendarDays(parseKey(a), parseKey(b)))
}

export { format, addDays, subDays }
