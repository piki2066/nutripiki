# Fase 1 — Base de datos más grande + escáner robusto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar la base local de alimentos y hacer que un escaneo sin resultado deje crear el alimento recordando su código, en NutriPal.

**Architecture:** Catálogo local en `src/db/seed.ts` con IDs deterministas; un "top-up" idempotente en el arranque añade alimentos nuevos a instalaciones existentes sin duplicar; el flujo de escaneo de `AddFoodScreen` deriva a "Crear alimento" con el código prerrellenado cuando no hay resultado o el código es interno del súper.

**Tech Stack:** React 18 + TypeScript + Vite, Dexie (IndexedDB), ZXing (ya integrados). Sin dependencias nuevas.

## Global Constraints

- UI en español; usar tokens/clases CSS y componentes existentes (`.card`, `.list`, `Sheet`, `Icon`, etc.).
- No añadir dependencias nuevas (especialmente nada pesado).
- `npm run build` (corre `tsc --noEmit` + `vite build`) DEBE pasar antes de dar nada por bueno.
- No hay framework de tests en el repo: el gate es `npm run build` + comprobaciones `node -e` para lógica pura + guarda dev de IDs + verificación manual con `npm run dev`.
- 100% local: ningún dato del usuario sale del dispositivo en esta fase.
- Nunca bloquear el arranque de la app si una operación de datos falla (try/catch + `console.error`).

---

### Task 1: IDs deterministas de los alimentos base + guarda de duplicados

**Files:**
- Modify: `src/db/seed.ts` (función `food()` y bloque final del módulo)

**Interfaces:**
- Consumes: `normalize` de `src/lib/search.ts` (`export function normalize(s: string): string`).
- Produces: cada `Food` de `SEED_FOODS` tiene `id` determinista con formato `seed_<slug>` donde
  `slug = normalize(name).replace(/\s+/g, '_')`. Helper local `seedId(name: string): string`.

- [ ] **Step 1: Añadir import de `normalize` en `seed.ts`**

En la cabecera de `src/db/seed.ts`, junto a los imports existentes, añade:

```ts
import { normalize } from '@/lib/search'
```

- [ ] **Step 2: Añadir helper `seedId` y usarlo en `food()`**

En `src/db/seed.ts`, antes de la función `food(...)`, añade el helper:

```ts
/** ID determinista y estable para un alimento base (permite top-up idempotente). */
function seedId(name: string): string {
  return 'seed_' + normalize(name).replace(/\s+/g, '_')
}
```

Y dentro de `food(...)`, sustituye `id: uid('seed'),` por:

```ts
    id: seedId(name),
```

(Mantén el resto de `food()` igual. `uid` sigue usándose para `serv()`, no lo borres.)

- [ ] **Step 3: Añadir guarda de IDs duplicados**

Al final de `src/db/seed.ts`, después de la definición de `SEED_FOODS` y antes (o después) de
`SEED_EXERCISES`, añade (se ejecuta siempre; es trivial y solo escribe en consola si hay un nombre
repetido, lo que rompería el top-up). No usa `import.meta.env` para no depender de tipos de Vite:

```ts
// Aviso si dos alimentos base generan el mismo id (nombres repetidos): rompería el top-up.
{
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const f of SEED_FOODS) {
    if (seen.has(f.id)) dups.add(f.id)
    else seen.add(f.id)
  }
  if (dups.size) console.error('[seed] IDs de alimentos duplicados (nombres repetidos):', [...dups])
}
```

- [ ] **Step 4: Verificar compilación**

Run: `npm run build`
Expected: termina sin errores de TypeScript ni de build.

- [ ] **Step 5: Verificar que no hay duplicados en desarrollo**

Run: `npm run dev` (déjalo arrancar), abre http://localhost:5173 y mira la consola del navegador.
Expected: NO aparece el mensaje `[seed] IDs de alimentos duplicados`. Corta el dev server.

- [ ] **Step 6: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): ids deterministas de alimentos base + guarda de duplicados"
```

---

### Task 2: Top-up idempotente de alimentos base en el arranque

**Files:**
- Modify: `src/db/init.ts` (nueva función `topUpSeeds`)
- Modify: `src/App.tsx` (llamar a `topUpSeeds` tras `seedIfEmpty`)

**Interfaces:**
- Consumes: `db` de `@/db/db`, `SEED_FOODS` de `./seed`, `tokenize` y `normalize` de `@/lib/search`.
- Produces: `export async function topUpSeeds(): Promise<void>` — añade a `db.foods` los `SEED_FOODS`
  que aún no existan (por id determinista ni por nombre normalizado), sin tocar filas existentes.

- [ ] **Step 1: Añadir `normalize` al import de `search` en `init.ts`**

En `src/db/init.ts`, cambia la línea de import de search para incluir `normalize`:

```ts
import { tokenize, normalize } from '@/lib/search'
```

- [ ] **Step 2: Implementar `topUpSeeds`**

Añade al final de `src/db/init.ts`:

```ts
/**
 * Añade los alimentos base que falten a instalaciones ya existentes (con datos),
 * sin duplicar ni sobrescribir. Idempotente: ejecutar en cada arranque es seguro.
 * Dedup por id determinista Y por nombre normalizado (evita duplicar seeds antiguos
 * que tenían ids aleatorios).
 */
export async function topUpSeeds(): Promise<void> {
  try {
    const seeds = await db.foods.where('source').equals('seed').toArray()
    const haveIds = new Set(seeds.map((f) => f.id))
    const haveNames = new Set(seeds.map((f) => normalize(f.name)))
    const missing = SEED_FOODS.filter(
      (f) => !haveIds.has(f.id) && !haveNames.has(normalize(f.name)),
    )
    if (!missing.length) return
    const withTokens = missing.map((f) => ({
      ...f,
      tokens: tokenize(`${f.name} ${f.brand ?? ''}`),
    })) as unknown as typeof SEED_FOODS
    await db.foods.bulkPut(withTokens)
  } catch (e) {
    console.error('topUpSeeds', e)
  }
}
```

- [ ] **Step 3: Llamar a `topUpSeeds` desde `App.tsx`**

En `src/App.tsx`, cambia el import de `init`:

```ts
import { seedIfEmpty, topUpSeeds } from './db/init'
```

Y en el `useEffect` de arranque, sustituye el bloque `seedIfEmpty()...` por:

```ts
    seedIfEmpty()
      .catch((e) => console.error('seedIfEmpty', e))
      .finally(() => {
        setSeeded(true)
        topUpSeeds().catch((e) => console.error('topUpSeeds', e))
      })
```

- [ ] **Step 4: Verificar compilación**

Run: `npm run build`
Expected: termina sin errores.

- [ ] **Step 5: Verificar que no rompe el arranque**

Run: `npm run dev`, abre http://localhost:5173.
Expected: la app arranca normal; sin errores `topUpSeeds` en consola. Corta el dev server.

- [ ] **Step 6: Commit**

```bash
git add src/db/init.ts src/App.tsx
git commit -m "feat(db): top-up idempotente de alimentos base en el arranque"
```

---

### Task 3: Ampliar el catálogo de alimentos base

**Files:**
- Modify: `src/db/seed.ts` (añadir entradas a `SEED_FOODS`)

**Interfaces:**
- Consumes: helpers existentes `n(...)` (nutrientes por 100 g), `serv(...)`, `food(...)` y `seedId`
  (Task 1). Cada nuevo alimento es `food('Nombre', n(kcal,carb,fat,prot,...), [serv(...)], opts?)`.
- Produces: `SEED_FOODS` ampliado a ~250 entradas, con **nombres únicos** (la guarda de la Task 1 lo
  comprueba en dev).

**Objetivo de la tarea:** pasar de ~70 a ~250 alimentos genéricos españoles, cubriendo los huecos
actuales. Se autoran siguiendo EXACTAMENTE el patrón de las entradas existentes (valores por 100 g/ml
aproximados y realistas). Categorías a cubrir y reparto orientativo:

- Aves/carnes (≈25): pollo crudo, pechuga de pollo cruda, contramuslo, alitas, pavo pechuga (filete
  fresco) y pavo en lonchas, ternera (solomillo, entrecot, picada), cerdo (chuleta, panceta, secreto),
  conejo, cordero, hamburguesa de ternera.
- Fiambres/embutidos (≈12): jamón cocido/york, pavo en lonchas (envasado), chorizo, salchichón,
  mortadela, bacon, salchichas, fuet, lomo embuchado, sobrasada.
- Pescados/marisco (≈14): bacalao, dorada, lubina, sardina, caballa, lenguado, trucha, gambas,
  langostinos, mejillones, calamar, pulpo, palitos de cangrejo, boquerones.
- Lácteos/huevos (≈12): kéfir, queso de untar, mozzarella, parmesano, queso azul, batido de chocolate,
  natillas, cuajada, leche semidesnatada, nata para cocinar, yogur de sabores, queso en lonchas.
- Legumbres/cereales/pasta (≈14): judías blancas/pintas, soja, guisantes secos, cuscús, bulgur, mijo,
  copos de maíz/cornflakes, muesli, arroz basmati, pasta integral, fideos, harina de trigo, pan de molde.
- Frutas (≈14): kiwi, melón, piña, mango, pera, ciruela, melocotón, mandarina, frambuesa, cereza,
  granada, higo, dátil, pasas.
- Verduras (≈18): calabacín, berenjena, champiñón, judía verde, guisantes, maíz dulce, coliflor, col,
  espárrago, remolacha, ajo, apio, puerro, alcachofa, calabaza, acelga, rúcula, setas.
- Platos típicos/preparados (≈14): tortilla de patata, lentejas guisadas, garbanzos con espinacas,
  paella, macarrones con tomate, espaguetis boloñesa, pizza margarita, hamburguesa completa, croquetas,
  empanadilla, gazpacho, ensaladilla rusa, sopa de fideos, arroz a la cubana.
- Bollería/snacks/dulces (≈12): croissant, magdalena, donut, tostada con aceite, galletas integrales,
  barrita de cereales, palomitas, helado de vainilla, flan, gominolas, churros, tarta de queso.
- Frutos secos/grasas (≈8): pistachos, anacardos, avellanas, semillas de girasol, semillas de chía,
  aguacate (ya existe — no repetir), aceite de girasol, margarina.
- Bebidas (≈10): agua, agua con gas, infusión/té, té con leche, bebida de avena, bebida de soja,
  bebida de almendras, vino tinto, vino blanco, bebida isotónica.

Ejemplos concretos en el formato exacto (añádelos y completa el resto siguiendo el mismo estilo):

```ts
  // --- Aves / carnes (ampliación) ---
  food('Pechuga de pollo cruda', n(120, 0, 2.6, 23, 0, 0, 0.7, 60, 334), [serv('Filete (150 g)', 150, true)]),
  food('Pollo entero crudo', n(167, 0, 9.3, 20, 0, 0, 2.7, 70, 220), [serv('Ración (150 g)', 150, true)]),
  food('Pavo pechuga (filete fresco)', n(105, 0, 1, 24, 0, 0, 0.3, 63, 302), [serv('Filete (130 g)', 130, true)]),
  food('Pavo en lonchas', n(95, 1.5, 1.6, 19, 0, 0.8, 0.5, 980, 260), [serv('Loncha (20 g)', 20, true), serv('Ración (60 g)', 60)]),
  food('Ternera picada', n(217, 0, 15, 19, 0, 0, 6, 66, 270), [serv('Ración (125 g)', 125, true)]),
  food('Hamburguesa de ternera (cruda)', n(250, 0, 20, 17, 0, 0, 8, 75, 250), [serv('Hamburguesa (115 g)', 115, true)]),
```

```ts
  // --- Fiambres / embutidos (ampliación) ---
  food('Jamón cocido (york)', n(108, 1.5, 3.5, 18, 0, 1, 1.2, 1100, 290), [serv('Loncha (20 g)', 20, true), serv('Ración (60 g)', 60)]),
  food('Bacon', n(541, 1.4, 42, 37, 0, 0, 14, 1717, 565), [serv('Loncha (12 g)', 12, true)]),
  food('Chorizo', n(455, 1.9, 38, 24, 0, 1, 14, 1240, 420), [serv('Ración (30 g)', 30, true)]),
  food('Salchichas tipo Frankfurt', n(290, 2.5, 26, 11, 0, 1.5, 9.5, 980, 200), [serv('Salchicha (40 g)', 40, true)]),
```

```ts
  // --- Frutas (ampliación) ---
  food('Kiwi', n(61, 15, 0.5, 1.1, 3, 9, 0, 3, 312), [serv('Unidad (75 g)', 75, true)]),
  food('Piña', n(50, 13, 0.1, 0.5, 1.4, 10, 0, 1, 109), [serv('Rodaja (84 g)', 84, true)]),
  food('Mango', n(60, 15, 0.4, 0.8, 1.6, 14, 0.1, 1, 168), [serv('Medio (100 g)', 100, true)]),
  food('Pera', n(57, 15, 0.1, 0.4, 3.1, 10, 0, 1, 116), [serv('Unidad (178 g)', 178, true)]),
```

```ts
  // --- Verduras (ampliación) ---
  food('Calabacín', n(17, 3.1, 0.3, 1.2, 1, 2.5, 0.1, 8, 261), [serv('Unidad (200 g)', 200, true)]),
  food('Berenjena', n(25, 6, 0.2, 1, 3, 3.5, 0, 2, 229), [serv('Media (150 g)', 150, true)]),
  food('Champiñones', n(22, 3.3, 0.3, 3.1, 1, 2, 0, 5, 318), [serv('Taza (70 g)', 70, true)]),
  food('Guisantes', n(81, 14, 0.4, 5.4, 5.7, 5.7, 0.1, 5, 244), [serv('Ración (100 g)', 100, true)]),
```

```ts
  // --- Platos / preparados ---
  food('Tortilla de patata', n(176, 14, 9.8, 6.4, 1.3, 1.2, 2.2, 320, 280), [serv('Pincho (125 g)', 125, true), serv('Ración (200 g)', 200)]),
  food('Lentejas guisadas', n(115, 16, 2.5, 7, 5, 1.5, 0.5, 320, 350), [serv('Plato (250 g)', 250, true)]),
  food('Paella', n(160, 21, 4.5, 8, 1, 1.5, 1.2, 420, 180), [serv('Plato (300 g)', 300, true)]),
  food('Pizza margarita', n(266, 33, 10, 11, 2.3, 3.6, 4.5, 598, 184), [serv('Porción (100 g)', 100, true), serv('Pizza (300 g)', 300)]),
```

```ts
  // --- Bebidas (ampliación) ---
  food('Agua', n(0, 0, 0, 0, 0, 0, 0, 1, 0), [serv('Vaso (250 ml)', 250, true), serv('Botella (500 ml)', 500)], { isLiquid: true }),
  food('Bebida de avena', n(45, 7, 1.5, 0.8, 0.8, 4, 0.2, 40, 80), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Vino tinto', n(85, 2.6, 0, 0.1, 0, 0.6, 0, 4, 127), [serv('Copa (150 ml)', 150, true)], { isLiquid: true }),
```

- [ ] **Step 1: Añadir las entradas**

En `src/db/seed.ts`, dentro del array `SEED_FOODS`, añade los bloques por categoría (los ejemplos de
arriba + el resto hasta ~250 entradas), respetando el formato `food('Nombre', n(...), [serv(...)], opts)`
y manteniendo **nombres únicos** (no repetir los ya existentes como "Aguacate", "Salmón", etc.).

- [ ] **Step 2: Verificar compilación**

Run: `npm run build`
Expected: sin errores de TypeScript.

- [ ] **Step 3: Verificar conteo y ausencia de duplicados**

Run: `npm run dev`, abre http://localhost:5173 y la consola del navegador.
Expected: NO aparece `[seed] IDs de alimentos duplicados`. En la app, ve a Diario → Añadir alimento,
busca "pavo" y "pollo": deben aparecer varias entradas nuevas. Corta el dev server.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): ampliar catalogo de alimentos genericos (~250)"
```

---

### Task 4: Detectar códigos internos de supermercado

**Files:**
- Modify: `src/lib/off.ts` (nueva función exportada)

**Interfaces:**
- Produces: `export function isStoreInternalBarcode(code: string): boolean` — `true` si `code` es un
  EAN-13 (13 dígitos) que empieza por `2` (numeración interna de tienda / peso variable).

- [ ] **Step 1: Añadir la función a `off.ts`**

Al final de `src/lib/off.ts`, añade:

```ts
/**
 * ¿Es un código interno de supermercado (peso variable / numeración de tienda)?
 * Los EAN-13 que empiezan por "2" están reservados a uso interno y NUNCA estarán
 * en bases de datos mundiales como OpenFoodFacts.
 */
export function isStoreInternalBarcode(code: string): boolean {
  return /^2\d{12}$/.test(code.trim())
}
```

- [ ] **Step 2: Verificar la lógica (comprobación automática)**

Run:

```bash
node -e "const f=c=>/^2\d{12}$/.test(c.trim()); console.log(f('2812345678901'), f('8410000000000'), f('123'), f(' 2000000000009 '))"
```

Expected: `true false false true`

- [ ] **Step 3: Verificar compilación**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/off.ts
git commit -m "feat(off): detectar codigos internos de supermercado (EAN-13 que empiezan por 2)"
```

---

### Task 5: Escaneo sin resultado → crear y recordar el código

**Files:**
- Modify: `src/features/foods/CreateFoodScreen.tsx` (prerrellenar `barcode`/`name` desde la URL)
- Modify: `src/features/foods/AddFoodScreen.tsx` (nuevo flujo en `onBarcode`)

**Interfaces:**
- Consumes: `isStoreInternalBarcode` de `@/lib/off` (Task 4); ruta existente `/food/new`
  (registrada en `App.tsx`); `useNavigate`/`useSearchParams` de `react-router-dom`.
- Produces: al escanear/teclear un código no encontrado, navega a
  `/food/new?barcode=<code>` y `CreateFoodScreen` lo muestra prerrellenado; al guardar, `upsertFood`
  persiste el `barcode`, de modo que el siguiente escaneo lo encuentra en local
  (`lookupBarcode` ya busca primero en `db.foods` por `barcode` dentro de `AddFoodScreen.onBarcode`).

- [ ] **Step 1: Prerrellenar `CreateFoodScreen` desde la URL**

En `src/features/foods/CreateFoodScreen.tsx`, cambia el import de router:

```ts
import { useNavigate, useSearchParams } from 'react-router-dom'
```

Dentro del componente, justo después de `const nav = useNavigate()`, añade:

```ts
  const [params] = useSearchParams()
```

Y cambia las inicializaciones de estado de `name` y `barcode`:

```ts
  const [name, setName] = useState(params.get('name') ?? '')
  const [barcode, setBarcode] = useState(params.get('barcode') ?? '')
```

(El resto del componente no cambia: ya guarda `barcode` en el `Food`.)

- [ ] **Step 2: Importar el helper en `AddFoodScreen`**

En `src/features/foods/AddFoodScreen.tsx`, cambia el import de `off` para incluir el helper:

```ts
import { searchOff, lookupBarcode, isStoreInternalBarcode } from '@/lib/off'
```

- [ ] **Step 3: Reescribir `onBarcode`**

En `src/features/foods/AddFoodScreen.tsx`, sustituye la función `onBarcode` por:

```ts
  async function onBarcode(code: string) {
    setScanOpen(false)
    // 1) ¿ya está en local (incluye productos creados antes con este código)?
    const local = await db.foods.where('barcode').equals(code).first()
    if (local) { setSelected(local); return }
    // 2) código interno del súper: no tiene sentido buscarlo en la red
    if (isStoreInternalBarcode(code)) {
      toast('Código interno del súper: créalo una vez y lo recordaré', { icon: 'info' })
      nav(`/food/new?barcode=${encodeURIComponent(code)}`)
      return
    }
    // 3) buscar en OpenFoodFacts
    toast('Buscando producto…')
    const found = await lookupBarcode(code)
    if (found) { setSelected(found); return }
    // 4) no está en ningún sitio: crear y recordar el código
    toast('No está en la base: créalo y lo recordaré', { icon: 'info' })
    nav(`/food/new?barcode=${encodeURIComponent(code)}`)
  }
```

(`nav` ya existe en el componente vía `const nav = useNavigate()`.)

- [ ] **Step 4: Verificar compilación**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual del flujo**

Run: `npm run dev`, abre http://localhost:5173. Ve a Diario → Añadir alimento → icono de escanear →
en el campo "Introduce el código" teclea `2812345678901` y envía.
Expected: toast de "código interno del súper" y abre "Crear alimento" con el código `2812345678901`
ya puesto. Repite con un EAN normal inexistente (p. ej. `9999999999994`): tras "Buscando producto…"
abre "Crear alimento" con ese código puesto. Rellena nombre + calorías, guarda; vuelve a escanear el
mismo código y comprueba que ahora abre el detalle del alimento creado. Corta el dev server.

- [ ] **Step 6: Commit**

```bash
git add src/features/foods/CreateFoodScreen.tsx src/features/foods/AddFoodScreen.tsx
git commit -m "feat(foods): escaneo sin resultado abre crear alimento con el codigo recordado"
```

---

### Task 6: Build final, desplegar y publicar el código

**Files:** (ninguno nuevo)

- [ ] **Step 1: Build final**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 2: Desplegar a GitHub Pages**

Run: `npm run deploy`
Expected: termina con `Desplegado: https://piki2066.github.io/nutripal/`.

- [ ] **Step 3: Publicar el código fuente en `main`**

```bash
git push origin main
```

Expected: push correcto (los commits de las tareas anteriores quedan en remoto).

---

## Notas de verificación final (manual, en la app desplegada o en dev)

- Buscar "pavo", "pollo", "lentejas", "pizza" devuelve alimentos nuevos.
- Escanear/teclear un código interno (`2…`) o un EAN inexistente abre "Crear alimento" con el código.
- Un alimento creado con un código se reconoce al volver a escanearlo.
- Tus datos previos siguen intactos (los alimentos nuevos se añadieron sin borrar nada).
