# Diseño — Base de datos más grande, escáner robusto y cuenta con sincronización

- **Fecha:** 2026-06-29
- **App:** NutriPal (PWA local, clon de MyFitnessPal)
- **Autor:** agente mantenedor + Alejandro
- **Estado:** aprobado el diseño general; pendiente de revisión del spec antes del plan de implementación

## Contexto y problema

Alejandro pidió dos cosas:

1. **El escáner no le coge productos.** Caso concreto: "pavo del Consum" (producto envasado de
   supermercado). La app ya usa OpenFoodFacts (millones de productos) para búsqueda por texto y por
   código de barras, pero:
   - Muchos productos de marca blanca / bandejas de carne **no están en OpenFoodFacts**.
   - Los productos frescos de súper suelen llevar un **código interno de tienda** (EAN-13 que
     empieza por `2`) que codifica peso/precio, **nunca** presente en bases mundiales.
   - El pollo/pavo fresco a granel directamente **no tiene código de barras**.
2. **Un "login para que nunca se pierda el registro".** Matiz clave: un login por sí solo no evita
   perder datos; lo que los protege es una **copia de seguridad / sincronización**. La app es a
   propósito 100% local (decisión de privacidad previa de Alejandro).

## Decisiones tomadas (con Alejandro)

- **Escáner:** la solución no es "un escáner mejor", sino (a) ampliar la base local para buscar por
  nombre y (b) mejorar el flujo cuando un escaneo no encuentra nada (crear y recordar el código).
- **Cuenta:** Alejandro eligió **cuenta usuario/contraseña que sincroniza**. Se implementará con
  **Supabase** (backend gestionado, gratis para su uso, sin servidor propio que mantener), no con un
  servidor a medida. Confirmó explícitamente que **acepta que sus datos vivan en la nube** (cifrados
  en tránsito y en reposo, protegidos por su cuenta, con recuperación de contraseña posible) — opción
  "nube normal", **no** cifrado extremo a extremo.
- **Decomposición:** se entrega en dos fases independientes, cada una con su ciclo spec → plan →
  implementación. **Se construye primero la Fase 1** (valor diario inmediato, sin dependencias
  externas ni decisiones de nube). La Fase 2 se diseñará en detalle al terminar la Fase 1.

---

## Fase 1 — Base de datos más grande + escáner robusto (CONSTRUIR AHORA)

### Objetivo de usuario

Que al buscar por nombre aparezcan muchos más alimentos, y que al escanear algo que no está (p. ej.
el pavo del Consum) la app deje **crearlo al momento y recordar ese código para siempre**, en lugar
de mostrar "no encontrado".

### Requisitos

- R1. Ampliar el catálogo local de alimentos genéricos españoles de ~70 a ~250–300 entradas.
- R2. Los alimentos base nuevos deben llegar **también a instalaciones existentes** (con datos), sin
  duplicar ni sobrescribir lo que el usuario haya creado o editado.
- R3. Al escanear un código que no esté ni en local ni en OpenFoodFacts, abrir "Crear alimento" con
  el **código ya rellenado**; al guardarlo, el siguiente escaneo de ese código lo encuentra en local.
- R4. Detectar **códigos internos de tienda** (EAN que empieza por `2`) y, en vez de buscar en la
  red sin éxito, mostrar un mensaje claro y llevar directo a crear el alimento.
- R5. No introducir dependencias nuevas. `npm run build` (tsc + vite) debe pasar.

### Diseño técnico

#### 1. Ampliación del catálogo — `src/db/seed.ts`

- Ampliar `SEED_FOODS` con ~180–230 entradas nuevas, priorizando los huecos actuales:
  - **Aves y carnes:** pollo crudo, pechuga de pollo cruda, pavo pechuga (lonchas y filete fresco),
    contramuslo, ternera (varios cortes), cerdo (varios cortes), conejo, cordero, picada mixta.
  - **Fiambres y embutidos:** jamón cocido/york, pavo en lonchas, chorizo, salchichón, mortadela,
    bacon, salchichas.
  - **Pescados y marisco:** bacalao, dorada, lubina, sardina, caballa, gambas, mejillones, calamar,
    palitos de cangrejo.
  - **Lácteos:** kéfir, queso de untar, mozzarella, parmesano, queso azul, batido, natillas, cuajada.
  - **Legumbres/cereales:** judías varias, soja, cuscús, bulgur, mijo, copos de maíz, muesli.
  - **Frutas/verduras:** kiwi, melón, piña, mango, pera, ciruela, melocotón, mandarina, frambuesa,
    calabacín, berenjena, champiñón, judía verde, guisantes, maíz dulce, coliflor, col, espárrago,
    remolacha, ajo, apio.
  - **Platos típicos / preparados:** tortilla de patata, lentejas/garbanzos guisados, paella,
    macarrones con tomate, pizza, hamburguesa, croquetas, empanadilla, gazpacho, ensaladilla.
  - **Bollería/snacks/bebidas:** croissant, magdalena, donut, tostada con aceite, cereales de
    desayuno, barrita, palomitas, frutos secos varios, agua, infusión, té, vino, bebidas vegetales.
  - Valores por 100 g/ml aproximados y realistas, mismo estilo que las entradas actuales.
- **IDs estables.** Hoy `food()` usa `uid('seed')` (aleatorio en cada build), lo que impide un
  top-up idempotente. Cambio: `food()` deriva un id determinista a partir del nombre, p. ej.
  `seed_<slug-del-nombre>` usando `normalize()` de `lib/search.ts` (minúsculas, sin acentos, `_`).
  Los nombres de seed deben ser únicos (se verifica en build/test).

#### 2. Top-up idempotente de la base — `src/db/init.ts` + `src/App.tsx`

- Nueva función `topUpSeeds()` en `init.ts`:
  - Lee los ids de seeds ya presentes (`db.foods.where('source').equals('seed')` o por id `seed_`).
  - Calcula qué `SEED_FOODS` faltan (por id estable) y hace `bulkAdd`/`bulkPut` **solo de los que
    faltan**, con sus `tokens` (igual que `seedIfEmpty`). Con ids estables es idempotente.
  - **No sobrescribe filas existentes** (ni `seed`, ni `custom`, ni `off`): solo añade las que aún no
    están. Así nunca pisa datos del usuario; el precio es que correcciones futuras a valores de un
    seed ya sembrado no se propagarían (aceptable; se puede forzar con un id nuevo si hiciera falta).
  - Nunca bloquea el arranque (try/catch + log), igual que `seedIfEmpty`.
- `seedIfEmpty()` se mantiene para primera instalación (siembra ejercicios y settings). En `App.tsx`,
  tras `seedIfEmpty()`, llamar a `topUpSeeds()` (encadenado, sin bloquear el render).

#### 3. Escaneo sin resultado → crear y recordar — `AddFoodScreen.tsx` + `CreateFoodScreen.tsx`

- `onBarcode(code)` en `AddFoodScreen`:
  1. Buscar en local por `barcode` (ya existe). Si está → abrir detalle (ya existe).
  2. Si es **código de tienda** (ver punto 4) → saltar la red e ir directo a crear.
  3. Si no, `lookupBarcode(code)` en OFF. Si lo encuentra → abrir detalle (ya existe).
  4. Si no lo encuentra → en vez de toast "no encontrado", navegar a
     `/food/new?barcode=<code>` (toast informativo "No está en la base, créalo y lo recordaré").
- `CreateFoodScreen`:
  - Leer `useSearchParams()` e inicializar `barcode` (y opcionalmente `name`) desde la query.
  - El resto del flujo ya guarda `barcode` en el `Food` y `upsertFood` lo persiste; como
    `lookupBarcode` mira primero en local por `barcode`, el siguiente escaneo lo encontrará.

#### 4. Detección de códigos de tienda — `src/lib/off.ts`

- Añadir `isStoreInternalBarcode(code: string): boolean`:
  - `true` si es EAN-13 de 13 dígitos que empieza por `2` (rango reservado a numeración interna
    de tienda / peso variable). Conservador para no marcar productos legítimos.
- Usado por `AddFoodScreen.onBarcode` (punto 3.2) para evitar una llamada de red inútil y dar el
  mensaje correcto.

### Manejo de errores

- Top-up y seed nunca rompen el arranque (try/catch + `console.error`).
- Búsqueda OFF: ya devuelve `[]`/`null` ante error de red (offline funciona con lo local + caché).
- Crear alimento desde escaneo: si el usuario cancela, no se guarda nada (comportamiento actual).

### Verificación

- `npm run build` pasa (tsc --noEmit + vite build).
- Test ligero: una comprobación de que los ids de seed son únicos y estables (sin colisiones de slug).
- Manual: buscar "pavo" y "pollo" → aparecen varias entradas; escanear/teclear un código inventado
  (p. ej. `2812345678901`) → detecta código de tienda y abre crear con el código puesto; teclear un
  EAN normal inexistente → abre crear con el código puesto.

### Archivos afectados (Fase 1)

- `src/db/seed.ts` — ampliación masiva + ids estables (slug).
- `src/db/init.ts` — `topUpSeeds()`.
- `src/App.tsx` — llamar a `topUpSeeds()` tras `seedIfEmpty()`.
- `src/features/foods/AddFoodScreen.tsx` — nuevo flujo de `onBarcode`.
- `src/features/foods/CreateFoodScreen.tsx` — prefijar `barcode`/`name` desde la query.
- `src/lib/off.ts` — `isStoreInternalBarcode()`.

### Fuera de alcance (Fase 1, YAGNI)

- Añadir una segunda fuente de datos de red (USDA, etc.): OFF ya es muy amplia y la combinación
  "base local grande + crear y recordar" cubre el caso real. Se puede reconsiderar más adelante.

---

## Fase 2 — Cuenta email/contraseña + sincronización (DISEÑO DETALLADO DESPUÉS)

Esquema general (su spec detallado se hará al terminar la Fase 1):

- **Supabase**: Auth (email + contraseña) + Postgres con Row Level Security (cada cuenta ve solo sus
  filas vía `user_id`). Cliente `@supabase/supabase-js`.
- **Local primero (opcional):** Dexie sigue siendo la fuente de verdad offline; la app funciona
  igual sin cuenta. Si el usuario inicia sesión, se activa la sincronización entre dispositivos.
- **Estrategia de sync:** "última modificación gana" por registro (`updatedAt`), con **tombstones**
  (marca de borrado) para propagar borrados. Empuje inicial de todo lo local al crear/entrar en la
  cuenta; luego push/pull incremental al estar online.
- **Cambios de modelo:** añadir `updatedAt` y marca de borrado a las tablas que sincronizan (varias
  hoy solo tienen `createdAt`); columna `userId`.
- **Fotos:** fuera de la sync v1 (Blobs), igual que el export actual; se valorará Supabase Storage.
- **UI:** pantalla de login/registro, opt-in desde Ajustes; estado de sesión y de sincronización.

### Riesgos / temas a resolver en el spec de la Fase 2

- Conflictos de merge y relojes de dispositivo (mitigado con LWW + `updatedAt` consistente).
- Migración de datos existentes (subida inicial sin duplicar).
- Límites del plan gratuito de Supabase y claves públicas en una PWA estática (uso de `anon key` +
  RLS; nunca claves de servicio en el cliente).
- Privacidad: confirmar en la UI qué se sube y permitir cerrar sesión / borrar la copia en la nube.

---

## Plan de entrega

1. **Ahora:** Fase 1 completa → `npm run build` ok → `npm run deploy` → commit/push de `main`.
2. **Después:** brainstorming + spec detallado de la Fase 2 → plan → implementación.
