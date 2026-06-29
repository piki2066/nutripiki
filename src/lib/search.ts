/** Normaliza texto: minúsculas, sin acentos, sin signos. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tokens (palabras de >=2 chars) para indexar/buscar alimentos. */
export function tokenize(s: string): string[] {
  return Array.from(new Set(normalize(s).split(' ').filter((t) => t.length >= 2)))
}

/** Puntúa un alimento frente a una consulta (mayor = mejor coincidencia). */
export function scoreMatch(name: string, brand: string | undefined, query: string): number {
  const q = normalize(query)
  if (!q) return 0
  const hay = normalize(`${name} ${brand ?? ''}`)
  if (hay === q) return 1000
  if (hay.startsWith(q)) return 500
  const words = q.split(' ').filter(Boolean)
  let score = 0
  for (const w of words) {
    if (hay.includes(w)) score += 100
    if (normalize(name).startsWith(w)) score += 50
  }
  return score
}
