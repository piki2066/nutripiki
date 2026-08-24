# Napkin — NutriPiki

## Patrones de código (alto valor)
1. **Inputs numéricos: usar `NumInput` de `src/components/ui.tsx`.** Nunca `onChange={(e) => setX(parseFloat(e.target.value) || 0)}` con estado number: al borrar, el campo se queda en "0". `NumInput` mantiene un borrador string (puede quedar vacío) y solo confirma números válidos acotados a min/max.
2. **No pasar `fmtNum()` como `value` de un `<input type="number">`** — devuelve coma decimal (es-ES) y el navegador rechaza el valor (campo en blanco). Solo para texto de solo lectura.
3. **[2026-08-24] Instalación PWA centralizada en `src/lib/pwa.ts`.** Captura `beforeinstallprompt` al cargar el módulo (por eso se importa desde `main.tsx`, antes que nada) y expone `useInstall()` / `promptInstall()` / `isStandalone()`.
   Do instead: reutilizar `useInstall()` y `<InstallPanel />` (`src/features/install/`) en vez de volver a detectar plataforma o duplicar los pasos de iOS/Android.
4. **[2026-08-24] Datos de una semana: `useWeekDays(week)` + `weekCalories(profile, days, hoy)`.**
   Do instead: no volver a montar bucles de `db.foodEntries.where('date')` por pantalla; el hook ya devuelve `items`, comido, planificado y ejercicio por día. Para pintarlo, `<WeekCaloriesCard>` (acepta `action` y `children`).
5. **[2026-08-24] Nube (solo Amigos) en `src/lib/cloud.ts`.** `@supabase/supabase-js` entra por `import()` dinámico (chunk aparte de ~58 KB gzip); config por `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` o pegada en la app.
   Do instead: nunca importar supabase-js de forma estática ni subir nada que no sea el resumen diario de `collectStats()`.
6. **[2026-08-24] Fricción = enemigo nº1 en lo social.** Alejandro rechazó el flujo con correo+contraseña, código tecleado y aceptar solicitud.
   Do instead: por defecto, entrar sin formularios (`signInAnonymous` con el nombre del perfil local) e invitar con enlace que conecta solo; el correo, siempre opcional y a posteriori.

## Domain Behavior Guardrails
1. **[2026-08-24] El presupuesto de calorías de un día es `dayCalorieBudget(profile, fecha, kcalEjercicio)`.** Suma el ejercicio SOLO si `profile.addExerciseCalories`, igual que `calorieSummary` en Hoy.
   Do instead: nunca hacer `effectiveCalorieGoal(...) + exKcal` a mano — descuadra Hoy con el Plan.
2. **Los datos van atados al ORIGEN (la URL) y, en iPhone, el icono instalado tiene almacenamiento separado de Safari.**
   Do instead: en cualquier flujo nuevo, empujar a instalar ANTES de meter datos y recordar la exportación JSON como respaldo.

## Supabase (operativa)
1. **[2026-08-24] El CLI no está instalado: usar `npx supabase@latest …`.** La sesión está en el llavero de macOS y sigue viva; `projects list`, `db push`, `config push` y `projects api-keys` funcionan sin login.
   Do instead: para cambios de esquema, añadir un fichero a `supabase/migrations/` y `db push` con la contraseña de `~/.nutripiki-supabase-db-password.txt`; para ajustes de Auth, editar `supabase/config.toml` y `config push`.
2. **[2026-08-24] Probar el backend real sin navegador.** Con la clave publishable se puede hacer `POST /auth/v1/signup` (alta anónima) y llamar a las RPC con el token; con la `service_role` se listan y borran usuarios en `/auth/v1/admin/users`.
   Do instead: montar el caso completo (dos altas, añadir amigo, subir resumen, comprobar que un tercero no ve nada) y **borrar los usuarios de prueba al terminar**.

## Verificación
1. `npm run build` siempre antes de dar nada por bueno; `npm test` para el motor de nutrición (incluye las sumas semanales).
2. Verificación de UI real sin navegador interactivo: `npm run preview` + Chrome headless con `--remote-debugging-port` y CDP (`Runtime.evaluate` con el setter nativo de `HTMLInputElement.prototype.value` + evento `input` burbujeante para simular tecleo en React; para blur, despachar `focusout` burbujeante — `element.blur()` no es fiable en headless).
3. **[2026-08-24] El SQL de Supabase se puede probar en serio sin tocar el proyecto real.** `initdb` + `pg_ctl` en un directorio temporal (socket en `/tmp/npg`: la ruta del scratchpad pasa de 103 bytes y falla), un stub con `auth.users` + `auth.uid()` leyendo `request.jwt.claim.sub`, roles `anon`/`authenticated`, y luego `set role authenticated` + `set request.jwt.claim.sub` para simular a cada usuario.
   Do instead: ejecutar `docs/supabase/schema.sql` ahí y comprobar las políticas RLS con casos positivos y negativos antes de dárselo a Alejandro.
4. **[2026-08-24] Atajos para probar pantallas que necesitan datos.** El onboarding se completa por CDP haciendo `click()` sobre botones buscados por `innerText`; y se pueden inyectar comidas directamente en IndexedDB (`indexedDB.open('nutripal')` → store `foodEntries`) y recargar, en vez de teclear por la UI.
   Do instead: inyectar → `Page.reload` → volcar `document.body.innerText` y comparar cifras con las esperadas a mano.
