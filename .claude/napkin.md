# Napkin — NutriPiki

## Patrones de código (alto valor)
1. **Inputs numéricos: usar `NumInput` de `src/components/ui.tsx`.** Nunca `onChange={(e) => setX(parseFloat(e.target.value) || 0)}` con estado number: al borrar, el campo se queda en "0". `NumInput` mantiene un borrador string (puede quedar vacío) y solo confirma números válidos acotados a min/max.
2. **No pasar `fmtNum()` como `value` de un `<input type="number">`** — devuelve coma decimal (es-ES) y el navegador rechaza el valor (campo en blanco). Solo para texto de solo lectura.
3. **[2026-08-24] Instalación PWA centralizada en `src/lib/pwa.ts`.** Captura `beforeinstallprompt` al cargar el módulo (por eso se importa desde `main.tsx`, antes que nada) y expone `useInstall()` / `promptInstall()` / `isStandalone()`.
   Do instead: reutilizar `useInstall()` y `<InstallPanel />` (`src/features/install/`) en vez de volver a detectar plataforma o duplicar los pasos de iOS/Android.
4. **[2026-08-24] Datos de una semana: `useWeekDays(week)` + `weekCalories(profile, days, hoy)`.**
   Do instead: no volver a montar bucles de `db.foodEntries.where('date')` por pantalla; el hook ya devuelve `items`, comido, planificado y ejercicio por día.

## Domain Behavior Guardrails
1. **[2026-08-24] El presupuesto de calorías de un día es `dayCalorieBudget(profile, fecha, kcalEjercicio)`.** Suma el ejercicio SOLO si `profile.addExerciseCalories`, igual que `calorieSummary` en Hoy.
   Do instead: nunca hacer `effectiveCalorieGoal(...) + exKcal` a mano — descuadra Hoy con el Plan.
2. **Los datos van atados al ORIGEN (la URL) y, en iPhone, el icono instalado tiene almacenamiento separado de Safari.**
   Do instead: en cualquier flujo nuevo, empujar a instalar ANTES de meter datos y recordar la exportación JSON como respaldo.

## Verificación
1. `npm run build` siempre antes de dar nada por bueno; `npm test` para el motor de nutrición (incluye las sumas semanales).
2. Verificación de UI real sin navegador interactivo: `npm run preview` + Chrome headless con `--remote-debugging-port` y CDP (`Runtime.evaluate` con el setter nativo de `HTMLInputElement.prototype.value` + evento `input` burbujeante para simular tecleo en React; para blur, despachar `focusout` burbujeante — `element.blur()` no es fiable en headless).
3. **[2026-08-24] Atajos para probar pantallas que necesitan datos.** El onboarding se completa por CDP haciendo `click()` sobre botones buscados por `innerText`; y se pueden inyectar comidas directamente en IndexedDB (`indexedDB.open('nutripal')` → store `foodEntries`) y recargar, en vez de teclear por la UI.
   Do instead: inyectar → `Page.reload` → volcar `document.body.innerText` y comparar cifras con las esperadas a mano.
