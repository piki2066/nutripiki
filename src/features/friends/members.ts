import type { DailyStat, FriendRow } from '@/lib/cloud'
import { dateKey, parseKey, subDays, weekRange } from '@/lib/date'

/** Un participante del muro de amigos (tú incluido), ya resumido. */
export interface Member {
  id: string
  name: string
  emoji: string
  isMe: boolean
  lastSeen?: string
  weekEaten: number
  weekGoal: number
  weekExKcal: number
  weekExMin: number
  weekLoggedDays: number
  streak: number
  weightKg: number | null
  weightDelta: number | null
  daily: DailyStat[]
}

/** Racha de días seguidos con registro, terminando hoy (o ayer si aún no hay). */
export function streakFrom(rows: DailyStat[], today: string): number {
  const logged = new Map(rows.map((r) => [r.date, r.logged]))
  let d = parseKey(today)
  if (!logged.get(today)) d = subDays(d, 1)
  let n = 0
  while (logged.get(dateKey(d))) { n++; d = subDays(d, 1) }
  return n
}

/** Resume 30 días de estadísticas en la ficha de un miembro. */
export function buildMember(
  base: { id: string; name: string; emoji: string; isMe: boolean; lastSeen?: string },
  rows: DailyStat[],
  today: string,
  startsMonday: boolean,
): Member {
  const daily = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1))
  const week = new Set(weekRange(today, startsMonday))
  const inWeek = daily.filter((r) => week.has(r.date))
  const weighed = daily.filter((r) => r.weight_kg != null)

  return {
    ...base,
    daily,
    weekEaten: inWeek.reduce((s, r) => s + r.kcal_eaten, 0),
    weekGoal: inWeek.reduce((s, r) => s + r.kcal_goal, 0),
    weekExKcal: inWeek.reduce((s, r) => s + r.exercise_kcal, 0),
    weekExMin: inWeek.reduce((s, r) => s + r.exercise_min, 0),
    weekLoggedDays: inWeek.filter((r) => r.logged).length,
    streak: streakFrom(daily, today),
    weightKg: weighed.length ? Number(weighed[weighed.length - 1].weight_kg) : null,
    weightDelta: weighed.length >= 2
      ? Number(weighed[weighed.length - 1].weight_kg) - Number(weighed[0].weight_kg)
      : null,
  }
}

/** Agrupa las filas que vienen de la nube por amigo. */
export function membersFromCloud(
  friends: FriendRow[],
  stats: DailyStat[],
  today: string,
  startsMonday: boolean,
): Member[] {
  return friends.map((f) => buildMember(
    { id: f.friend_id, name: f.display_name, emoji: f.emoji, isMe: false, lastSeen: f.last_seen },
    stats.filter((s) => s.user_id === f.friend_id),
    today,
    startsMonday,
  ))
}

/** Orden del muro: primero quien más constancia lleva. */
export function rankMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak
    if (b.weekLoggedDays !== a.weekLoggedDays) return b.weekLoggedDays - a.weekLoggedDays
    return b.weekExKcal - a.weekExKcal
  })
}
