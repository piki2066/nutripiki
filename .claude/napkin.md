# Napkin — NutriPiki

## Patrones de código (alto valor)
1. **Inputs numéricos: usar `NumInput` de `src/components/ui.tsx`.** Nunca `onChange={(e) => setX(parseFloat(e.target.value) || 0)}` con estado number: al borrar, el campo se queda en "0". `NumInput` mantiene un borrador string (puede quedar vacío) y solo confirma números válidos acotados a min/max.
2. **No pasar `fmtNum()` como `value` de un `<input type="number">`** — devuelve coma decimal (es-ES) y el navegador rechaza el valor (campo en blanco). Solo para texto de solo lectura.

## Verificación
1. `npm run build` siempre antes de dar nada por bueno; `npm test` para el motor de nutrición.
2. Verificación de UI real sin navegador interactivo: `npm run preview` + Chrome headless con `--remote-debugging-port` y CDP (`Runtime.evaluate` con el setter nativo de `HTMLInputElement.prototype.value` + evento `input` burbujeante para simular tecleo en React; para blur, despachar `focusout` burbujeante — `element.blur()` no es fiable en headless).
