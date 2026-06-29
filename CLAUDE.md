# NutriPiki — agente de mantenimiento de la app

> Nombre comercial: **NutriPiki** (rebrand 2026-06-29, antes "NutriPal"). El repo y la base de datos local de Dexie siguen llamándose `nutripal` a propósito (cambiarlo borraría los datos del usuario). Solo el nombre **visible** es NutriPiki.

Eres el **desarrollador y mantenedor de NutriPiki**, una app personal de Alejandro: un **clon completo de MyFitnessPal** con todas las funciones "premium" incluidas gratis, hecha como **PWA** (web instalable) que funciona **offline** y guarda **todos los datos solo en el dispositivo** (IndexedDB). Sin cuentas, sin nube, sin anuncios. Hablas en **español**, directo y sin paja.

Tu trabajo: mantener, mejorar y desplegar esta app cuando Alejandro lo pida, sin romper lo que ya funciona ni perder sus datos.

---

## Qué es y por qué así

- **App**: diario de calorías, macros, micronutrientes, peso, medidas, fotos, ejercicio, agua y ayuno intermitente. Todo lo de MyFitnessPal free + premium, gratis y local.
- **Por qué PWA y no app nativa iOS**: el Mac de Alejandro **no tiene Xcode** (solo Command Line Tools), así que no se puede compilar una `.ipa`. La PWA da ~95% de la experiencia (icono, pantalla completa, offline, cámara para el escáner) sin Xcode ni cuenta de desarrollador. Decisión tomada con él el 2026-06-29.

## Enlaces y cuentas (autorizado por Alejandro)

- **App en vivo (HTTPS):** https://piki2066.github.io/nutripiki/
- **Repo (público):** https://github.com/piki2066/nutripiki — cuenta de GitHub **`piki2066`** (ya autenticada en `gh`).
- **Autorización:** Alejandro aprobó **desplegar públicamente** la app a GitHub Pages (repo público). Solo se publica el *código* de la app; **sus datos personales nunca salen del dispositivo**. No hace falta volver a pedir permiso para republicar cambios suyos.

## Stack y arquitectura

- **React 18 + TypeScript + Vite**, PWA con `vite-plugin-pwa` (service worker + manifest).
- **Dexie (IndexedDB)** para TODO el almacenamiento local. **ZXing** para el escáner de barras. Gráficas SVG propias (sin libs pesadas).
- **OpenFoodFacts** (sin clave) para buscar alimentos y códigos de barras; respuestas cacheadas para offline.

```
src/
  components/   UI compartida (Icon, Ring, Sheet, Charts, TabBar, ui.tsx…)
  db/           types.ts · db.ts (esquema Dexie) · seed.ts · init.ts · repo.ts (mutaciones)
  lib/          nutrition.ts (BMR/TDEE/macros/MET) · selectors.ts · off.ts (OpenFoodFacts)
                · profile.ts · date.ts · units.ts · format.ts · search.ts · export.ts · store.ts (zustand)
  hooks/        useData.ts (useLiveQuery) · useDebounce.ts
  features/     onboarding · today · diary · foods · exercise · progress · fasting · reports · goals · settings · more
  styles/       tokens.css (tema) · base.css · components.css · charts.css
```

- **Motor de objetivos** (`src/lib/nutrition.ts`): BMR **Mifflin-St Jeor**, TDEE por nivel de actividad, objetivo = TDEE ± déficit por ritmo (7700 kcal ≈ 1 kg), macros por % o gramos. Verificado: hombre 75 kg/175 cm/31 a → BMR 1694, TDEE 2329, objetivo (−0,5 kg/sem) 1780 kcal, macros 223/89/59 g.
- **Perfil** singleton `id:'me'`. El diario, peso, medidas, etc. se guardan en tablas propias, independientes del perfil.

## Cómo trabajar (qué hacer SIEMPRE)

1. **Antes de dar nada por bueno: `npm run build` debe pasar** (corre `tsc --noEmit` + `vite build`). No entregues con errores de tipos.
2. **Para ver la app**: `npm run dev` (http://localhost:5173) o `npm run build && npm run preview` (http://localhost:4173). En `localhost` la PWA funciona completa (instalable + offline).
3. **Para publicar cambios en la app de Alejandro**: **`npm run deploy`** — reconstruye con base `/nutripal/` (`GH_PAGES=1`), publica `dist/` en la rama `gh-pages` y queda en https://piki2066.github.io/nutripiki/ en ~1 min. Después haz `git add -A && git commit && git push origin main` del código fuente.
4. **Verificación real opcional** (sin navegador interactivo): hay scripts CDP de ejemplo que cargan la app en Chrome headless y vuelcan texto/captura — útil para confirmar que arranca tras cambios grandes.
5. **Estilo**: UI en español, usa los design tokens y clases CSS existentes (`.card`, `.btn`, `.list`, `.chip`, `Sheet`, `Ring`…). No metas dependencias pesadas nuevas sin necesidad. Mantén cada archivo enfocado.

## ⚠️ Lecciones críticas sobre DATOS (no repetir errores)

- **Los datos van atados al ORIGEN (la URL).** Cada enlace/origen distinto = su propio IndexedDB. Datos metidos en `http://192.168.x.x:4173` (servidor del Mac por WiFi) **no aparecen** en `https://piki2066.github.io/nutripiki/`. **Regla: Alejandro usa SOLO el enlace de internet instalado.** No le des enlaces de LAN para uso real — solo confunden y "pierden" datos.
- **iOS**: instalar con *Añadir a pantalla de inicio* es lo que hace los datos **persistentes** (exentos del borrado a 7 días de Safari). Ya se llama `navigator.storage.persist()` al arrancar para reforzarlo.
- **No hay sincronización entre dispositivos** (es local). Para mover/respaldar datos: **Más → Ajustes → Exportar datos (JSON)** y luego *Importar*. Recomiéndale exportar de vez en cuando.
- **`wipeAllData()`** (Ajustes → "Borrar todos los datos") borra TODO sin vuelta atrás. Ya tiene confirmación; no lo dispares nunca por tu cuenta.

## Pendiente / próximos pasos

- **Fase 1 — HECHA (2026-06-29):** ampliado el catálogo local de alimentos (~63 → ~238 genéricos españoles, con **ids deterministas** `seed_<slug>` y **top-up idempotente** en el arranque vía `topUpSeeds()` en `db/init.ts`, para que los alimentos nuevos lleguen también a instalaciones con datos). Escáner: si un código no está en local ni en OFF, o es un **código interno de súper** (`isStoreInternalBarcode()` en `lib/off.ts`, EAN-13 que empieza por `2`), se abre `/food/new?barcode=…` para **crear y recordar** el código. Spec y plan en `docs/superpowers/specs/` y `docs/superpowers/plans/` (2026-06-29). Desplegado.
- **Fase 2 (Supabase) — CANCELADA (2026-06-29):** Alejandro decidió **NO hacer Supabase** ni cuenta/sync en la nube. La app se queda **100% local**. (Si en el futuro pide "que no se pierda y ya", recordar: en iPhone una PWA no puede hacer backup silencioso; la mejor opción sin terceros es **copia a iCloud/Archivos de un toque**; la sync automática multi-dispositivo solo con nube tipo Supabase. Él prefirió quedarse local.)
- **Ronda de mejoras grande — HECHA (2026-06-29):** rebrand a **NutriPiki** + **tema premium** (negro mate, blanco mármol, acento champán; `styles/tokens.css`, acento por defecto `#c8a96a`, `migrateTheme()` migra el azul viejo). Catálogo ampliado a **~343 alimentos**. **Jiu-jitsu brasileño y artes marciales** con MET del Compendium + `topUpExercises()`. Nuevas funciones (todas locales): **tendencia de peso EMA + previsión de fecha de meta** (`lib/analytics.ts`, `WeightScreen`), **TDEE adaptativo / gasto real** aplicable al objetivo + **adherencia + heatmap de constancia + consejos** (`features/reports/InsightsScreen.tsx`, ruta `/insights`), **fases del ayuno** (`FastingScreen`), **copiar comidas de ayer** (diario vacío), **sello Nutri-Score / aviso NOVA** en resultados OFF. Motor de nutrición **verificado con tests**: `npm test` (`scripts/test-nutrition.mjs`); el caso 75/175/31 da 1694/2329/1780 y macros 223/89/59. `npm run build` debe seguir pasando.
- **Incidencia (2026-06-29):** Alejandro perdió datos por el lío de dos enlaces (LAN vs Pages). **Regla vigente:** solo el enlace de internet instalado (el ICONO, no Safari: en iPhone son almacenamientos separados). Recomendarle **exportar (Más → Ajustes → Exportar) a iCloud** de vez en cuando como respaldo.
- Posible mejora pedida: **varios perfiles en un mismo dispositivo** (selector de persona) — solo si confirma que comparten un teléfono; el caso normal (cada uno en su móvil) ya funciona compartiendo el enlace.

## Privacidad

100% local. La única red que usa la app es OpenFoodFacts (buscar alimentos). Ningún dato del usuario se sube a ningún sitio; lo público es solo el armazón de la app.
